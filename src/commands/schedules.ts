import {
  createSchedule,
  deleteSchedule,
  schedule,
  schedules,
  updateSchedule,
  type GetOrganizationsOrgIdSchedulesParams,
  type ScheduleCreateRequest,
  type ScheduleResponse,
  type ScheduleUpdateRequest,
} from "../api/endpoints.ts";
import { offsetPages } from "../api/paginate.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cellText, die, enabledDisabled, guard, json, print } from "../lib.ts";
import { jsonBody } from "./input.ts";

export type SchedulesListOptions = { org?: string; json: boolean; limit?: number };
export type ScheduleIdOptions = { scheduleId: string; org?: string; json: boolean };

// create / update で共通のフラグ群。CLI 名 → API フィールド名の対応をここに閉じ込める
export type ScheduleFlagOptions = {
  name?: string;
  prompt?: string;
  scheduleType?: string;
  frequency?: string;
  intervalCount?: number;
  scheduledAt?: string;
  agent?: string;
  notifyOn?: string;
  platform?: string;
  playbookId?: string;
  skillPlugin?: string;
  skillName?: string;
  tags?: string[];
  slackChannelId?: string;
  slackTeamId?: string;
  targetDevinId?: string;
  bypassApproval?: boolean;
  bodyJson?: string;
  bodyFile?: string;
};
export type ScheduleCreateOptions = ScheduleFlagOptions & {
  org?: string;
  json: boolean;
  createAsUserId?: string;
};
export type ScheduleUpdateOptions = ScheduleFlagOptions & {
  scheduleId: string;
  org?: string;
  json: boolean;
  enabled?: boolean;
  disabled?: boolean;
  runAsUserId?: string;
};

const AGENTS = ["devin", "data_analyst"] as const;
const NOTIFY_ON = ["always", "failure", "never"] as const;
const SCHEDULE_TYPES = ["recurring", "one_time"] as const;

const oneOf = (
  value: string | undefined,
  allowed: readonly string[],
  flag: string,
): string | undefined => {
  if (value === undefined) return undefined;
  if (!allowed.includes(value))
    return die(`${flag} は ${allowed.join(" / ")} のいずれか: ${value}`, 2);
  return value;
};

// フラグで指定された項目だけを API フィールド名のオブジェクトにする (未指定はキー自体を出さない)
function scheduleFields(o: ScheduleFlagOptions): Record<string, unknown> {
  const f: Record<string, unknown> = {};
  if (o.name !== undefined) f.name = o.name;
  if (o.prompt !== undefined) f.prompt = o.prompt;
  const st = oneOf(o.scheduleType, SCHEDULE_TYPES, "--schedule-type");
  if (st !== undefined) f.schedule_type = st;
  if (o.frequency !== undefined) f.frequency = o.frequency;
  if (o.intervalCount !== undefined) f.interval_count = o.intervalCount;
  if (o.scheduledAt !== undefined) f.scheduled_at = o.scheduledAt;
  const ag = oneOf(o.agent, AGENTS, "--agent");
  if (ag !== undefined) f.agent = ag;
  const no = oneOf(o.notifyOn, NOTIFY_ON, "--notify-on");
  if (no !== undefined) f.notify_on = no;
  if (o.platform !== undefined) f.platform = o.platform;
  if (o.playbookId !== undefined) f.playbook_id = o.playbookId;
  if (o.slackChannelId !== undefined) f.slack_channel_id = o.slackChannelId;
  if (o.slackTeamId !== undefined) f.slack_team_id = o.slackTeamId;
  if (o.targetDevinId !== undefined) f.target_devin_id = o.targetDevinId;
  if (o.bypassApproval === true) f.bypass_approval = true;
  if (o.tags !== undefined && o.tags.length > 0) f.tags = o.tags;
  if (o.skillPlugin !== undefined || o.skillName !== undefined) {
    if (o.skillPlugin === undefined || o.skillName === undefined)
      die("--skill-plugin と --skill-name は両方指定する", 2);
    f.skill_ref = { plugin_identity: o.skillPlugin, skill_name: o.skillName };
  }
  return f;
}

// ScheduleResponse に schedule_id フィールドは無い (spec の欠落)。
// パスの {schedule_id} には scheduled_session_id を使う (terraform provider と同じ対応)
const scheduleId = (s: ScheduleResponse): string => s.scheduled_session_id;

const skillRefText = (s: ScheduleResponse["skill_ref"]): string => {
  if (!s) return "-";
  return cellText(JSON.stringify(s));
};

const SCHEDULE_LIST_HEADER =
  "schedule_id\tname\tenabled\tagent\tschedule_type\tfrequency\tinterval_count\tscheduled_at\tnotify_on\tplaybook_id\tupdated_at";
function scheduleListLines(items: ScheduleResponse[]): string[] {
  const lines = [SCHEDULE_LIST_HEADER];
  for (const s of items)
    lines.push(
      [
        cellText(scheduleId(s)),
        cellText(s.name),
        cellText(s.enabled),
        cellText(s.agent),
        cellText(s.schedule_type),
        cellText(s.frequency),
        cellText(s.interval_count),
        cellText(s.scheduled_at),
        cellText(s.notify_on),
        cellText(s.playbook?.playbook_id),
        cellText(s.updated_at),
      ].join("\t"),
    );
  return lines;
}

// 単体の schedule。prompt は複数行になり得るので最後の列にそのまま出す
const SCHEDULE_DETAIL_HEADER =
  "schedule_id\tname\tenabled\tagent\tschedule_type\tfrequency\tinterval_count\tscheduled_at\tnotify_on\tplatform\tplaybook_id\tskill_ref\ttags\ttarget_devin_id\tslack_channel_id\tslack_team_id\tbypass_approval\tconsecutive_failures\tcreated_by\tcreated_at\tupdated_at\tlast_executed_at\tlast_error_at\tlast_error_message\tprompt";
function scheduleDetailLines(s: ScheduleResponse): string[] {
  return [
    SCHEDULE_DETAIL_HEADER,
    [
      cellText(scheduleId(s)),
      cellText(s.name),
      cellText(s.enabled),
      cellText(s.agent),
      cellText(s.schedule_type),
      cellText(s.frequency),
      cellText(s.interval_count),
      cellText(s.scheduled_at),
      cellText(s.notify_on),
      cellText(s.platform),
      cellText(s.playbook?.playbook_id),
      skillRefText(s.skill_ref),
      cellText(s.tags?.join(",")),
      cellText(s.target_devin_id),
      cellText(s.slack_channel_id),
      cellText(s.slack_team_id),
      cellText(s.bypass_approval),
      cellText(s.consecutive_failures),
      cellText(s.created_by),
      cellText(s.created_at),
      cellText(s.updated_at),
      cellText(s.last_executed_at),
      cellText(s.last_error_at),
      cellText(s.last_error_message),
      s.prompt,
    ].join("\t"),
  ];
}

const emitSchedule = (s: ScheduleResponse, asJson: boolean): number => {
  if (asJson) {
    json(s);
    return 0;
  }
  for (const line of scheduleDetailLines(s)) print(line);
  return 0;
};

const emitSchedules = (items: ScheduleResponse[], asJson: boolean): number => {
  if (asJson) {
    json({ items });
    return 0;
  }
  for (const line of scheduleListLines(items)) print(line);
  return 0;
};

// schedules は deprecated。新規の定期実行は automations の schedule:recurring trigger を使う
export const DEPRECATED_NOTE =
  "schedules は deprecated。新規作成は automations の schedule:recurring trigger を使う";

export const runSchedulesList = guard(async (o: SchedulesListOptions) => {
  const params: GetOrganizationsOrgIdSchedulesParams = {};
  const orgId = await resolveOrgId(o.org);
  const items = await offsetPages(
    (offset, limit) => schedules(orgId, { ...params, offset, limit }),
    o.limit,
  );
  return emitSchedules(items, o.json);
});

export const runScheduleGet = guard(async (o: ScheduleIdOptions) => {
  const orgId = await resolveOrgId(o.org);
  const s = await schedule(orgId, o.scheduleId);
  return emitSchedule(s, o.json);
});

// create はフラットなフィールドなので --body-json/--body-file とフラグを浅くマージする
// (フラグ優先)。name と prompt はマージ後に必須
export const runScheduleCreate = guard(async (o: ScheduleCreateOptions) => {
  const fields = scheduleFields(o);
  if (o.createAsUserId !== undefined) fields.create_as_user_id = o.createAsUserId;
  const body = { ...jsonBody(o), ...fields } as unknown as ScheduleCreateRequest;
  const missing = ["name", "prompt"].filter((k) => {
    const v = (body as unknown as Record<string, unknown>)[k];
    return v === undefined || v === "";
  });
  if (missing.length > 0)
    return die(
      `必須フィールドが無い: ${missing.map((k) => `--${k.replaceAll("_", "-")}`).join(", ")}`,
      2,
    );
  const orgId = await resolveOrgId(o.org);
  const s = await createSchedule(orgId, body);
  return emitSchedule(s, o.json);
});

export const runScheduleUpdate = guard(async (o: ScheduleUpdateOptions) => {
  const fields = scheduleFields(o);
  const en = enabledDisabled(o);
  if (en !== undefined) fields.enabled = en;
  if (o.runAsUserId !== undefined) fields.run_as_user_id = o.runAsUserId;
  const patch = { ...jsonBody(o), ...fields };
  if (Object.keys(patch).length === 0)
    return die("更新するフィールドを指定する (フラグか --body-json/--body-file)", 2);
  const orgId = await resolveOrgId(o.org);
  const s = await updateSchedule(orgId, o.scheduleId, patch as ScheduleUpdateRequest);
  return emitSchedule(s, o.json);
});

export const runScheduleDelete = guard(async (o: ScheduleIdOptions) => {
  const orgId = await resolveOrgId(o.org);
  const s = await deleteSchedule(orgId, o.scheduleId);
  return emitSchedule(s, o.json);
});
