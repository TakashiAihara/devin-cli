#!/usr/bin/env bun
import { Argument, Command, InvalidArgumentError, Option } from "commander";
import { runAttachmentDownload, runAttachmentUpload } from "./commands/attachments.ts";
import {
  runAutomationCreate,
  runAutomationDelete,
  runAutomationGet,
  runAutomationsList,
  runAutomationSchemas,
  runAutomationTemplates,
  runAutomationUpdate,
  type AutomationCreateOptions,
  type AutomationIdOptions,
  type AutomationSchemasOptions,
  type AutomationTemplatesOptions,
  type AutomationUpdateOptions,
  type AutomationsListOptions,
} from "./commands/automations.ts";
import {
  SessionCreateRequestDevinMode,
  SessionResponseOrigin,
  SessionResponseStatus,
} from "./generated/api.schemas.ts";
import { runBilling } from "./commands/billing.ts";
import { runCompletion, SHELLS, type Shell } from "./commands/completion.ts";
import {
  runConsumptionDaily,
  runConsumptionServiceUser,
  runConsumptionSession,
  runConsumptionUser,
} from "./commands/consumption.ts";
import { runDefaultPlatformGet, runDefaultPlatformSet } from "./commands/default-platform.ts";
import { METRICS, runMetrics, type MetricsName } from "./commands/metrics.ts";
import { runMembersGet, runMembersIdpUsers, runMembersList } from "./commands/members.ts";
import {
  runNotesCreate,
  runNotesDelete,
  runNotesFolders,
  runNotesGet,
  runNotesList,
  runNotesUpdate,
  type NoteCreateOptions,
  type NoteIdOptions,
  type NoteUpdateOptions,
  type NotesFoldersOptions,
  type NotesListOptions,
} from "./commands/notes.ts";
import {
  runPlaybookCreate,
  runPlaybookDelete,
  runPlaybookGet,
  runPlaybookUpdate,
  runPlaybooksList,
  type PlaybookWriteOptions,
} from "./commands/playbooks.ts";
import { runPrReviewCreate, runPrReviewGet } from "./commands/pr-reviews.ts";
import {
  DEPRECATED_NOTE,
  runScheduleCreate,
  runScheduleDelete,
  runScheduleGet,
  runSchedulesList,
  runScheduleUpdate,
  type ScheduleCreateOptions,
  type ScheduleIdOptions,
  type ScheduleUpdateOptions,
  type SchedulesListOptions,
} from "./commands/schedules.ts";
import {
  runSecurityProfileSettingsGet,
  runSecurityProfileSettingsUpdate,
} from "./commands/security-profile-settings.ts";
import {
  runSecurityProfileCreate,
  runSecurityProfileDelete,
  runSecurityProfileGet,
  runSecurityProfileUpdate,
  runSecurityProfilesList,
  type SecurityProfileWriteOptions,
} from "./commands/security-profiles.ts";
import {
  runSessionsArchive,
  runSessionsAttachments,
  runSessionsCreate,
  runSessionsDelete,
  runSessionsGet,
  runSessionsInsights,
  runSessionsList,
  runSessionsMessages,
  runSessionsTagsAdd,
  runSessionsTagsGet,
  runSessionsTagsSet,
  type SessionCreateOptions,
  type SessionFilterOptions,
} from "./commands/sessions.ts";
import { runSelf } from "./commands/self.ts";
import { VERSION } from "./version.ts";

const JSON_FLAG = "--json";
const JSON_HELP = "TSV ではなく JSON を stdout に出す";

const program = new Command();
program.exitOverride((e) => process.exit(e.exitCode === 0 ? 0 : 2));

program
  .name("devin-cli")
  .description(
    "Devin API v3 の self / billing / consumption / metrics / knowledge / automations / schedules",
  )
  .version(VERSION);

program.addHelpText(
  "after",
  `
環境変数:
  DEVIN_API_KEY          cog_ で始まる PAT / service user key
  DEVIN_ORG_ID           org ID (省略時は --org > env > config > /v3/self の順で解決)
  DEVIN_API_BASE_URL     既定 https://api.devin.ai (origin のみ)
  DEVIN_API_TIMEOUT      API の時間切れ (秒。既定 20)
  DEVIN_COMMAND_TIMEOUT  設定の *_command の時間切れ (秒。既定 60)

秘密と接続先は env か設定ファイルで渡す。設定ファイルは
$XDG_CONFIG_HOME/devin-cli/config.toml (XDG_CONFIG_HOME が無ければ ~/.config/devin-cli/config.toml)。
api_key_command / org_id / api_base_url が書ける。秘密の平文は書けない。
`,
);

// consumption / metrics とも API 側の上限は 100 日 (実測: 超えると 422)
const MAX_DAYS = 100;
const days = (value: string): number => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_DAYS)
    throw new InvalidArgumentError(`1〜${MAX_DAYS} の整数を指定する`);
  return n;
};

const daysOption = () =>
  new Option(
    "--days <n>",
    "直近 N 暦日 (今日を含む。consumption は UTC-8、metrics は UTC の日境界)",
  )
    .argParser(days)
    .default(30);
const orgOption = () => new Option("--org <id>", "org ID (省略時は自動解決)");

// list 系の --limit。ページを辿って集める総件数の上限 (省略時は全件)
const positiveInt = (value: string): number => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new InvalidArgumentError("1 以上の整数を指定する");
  return n;
};
const limitOption = () =>
  new Option("--limit <n>", "取得する最大件数 (省略時は全件)").argParser(positiveInt);

// 繰り返し指定できるオプション用 (--trigger / --agent-type / --metadata / --tags / --mcp-server)
const append = (value: string, prev: string[] = []): string[] => [...prev, value];

const boolValue = (value: string): boolean => {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new InvalidArgumentError("true か false を指定する");
};

program
  .command("self")
  .description("GET /v3/self。認証と principal の確認")
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { json?: boolean }) => {
    process.exit(await runSelf({ json: opts.json === true }));
  });

program
  .command("billing")
  .description("直近 N 日の ACU 消費サマリ (合計・製品別・日別)")
  .addOption(daysOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { days: number; org?: string; json?: boolean }) => {
    process.exit(await runBilling({ days: opts.days, org: opts.org, json: opts.json === true }));
  });

const consumption = program
  .command("consumption")
  .description("日次 ACU 消費 (組織・ユーザー・service user・session)");

consumption
  .command("daily")
  .description("組織の日次消費")
  .addOption(daysOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { days: number; org?: string; json?: boolean }) => {
    process.exit(
      await runConsumptionDaily({ days: opts.days, org: opts.org, json: opts.json === true }),
    );
  });

consumption
  .command("user")
  .description("ユーザーの日次消費 (user_id 省略時は self の user_id)")
  .argument("[user_id]", "ユーザー ID")
  .addOption(daysOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (userId: string | undefined, opts: { days: number; org?: string; json?: boolean }) => {
      process.exit(
        await runConsumptionUser({
          userId,
          days: opts.days,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

consumption
  .command("service-user")
  .description("service user の日次消費")
  .argument("<service_user_id>", "service user ID")
  .addOption(daysOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (serviceUserId: string, opts: { days: number; org?: string; json?: boolean }) => {
    process.exit(
      await runConsumptionServiceUser({
        serviceUserId,
        days: opts.days,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

consumption
  .command("session")
  .description("session の日次消費")
  .argument("<session_id>", "session ID")
  .addOption(daysOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (sessionId: string, opts: { days: number; org?: string; json?: boolean }) => {
    process.exit(
      await runConsumptionSession({
        sessionId,
        days: opts.days,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

program
  .command("metrics")
  .description("組織の利用 metrics (usage/sessions/prs/searches/dau/wau/mau/active-users)")
  .addArgument(new Argument("<name>", "metrics 名").choices(METRICS))
  .addOption(daysOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (name: MetricsName, opts: { days: number; org?: string; json?: boolean }) => {
    process.exit(
      await runMetrics({ name, days: opts.days, org: opts.org, json: opts.json === true }),
    );
  });

const notes = program.command("notes").description("knowledge notes (org scope)");

notes
  .command("folders")
  .description("フォルダ一覧と note 数 (GET /knowledge/folders)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: NotesFoldersOptions) => {
    process.exit(await runNotesFolders(o));
  });

notes
  .command("list")
  .description("notes 一覧 (GET /knowledge/notes)")
  .addOption(orgOption())
  .addOption(limitOption())
  .option("--folder <path>", "folder path で絞る (notes folders の path 列)")
  .option("--search <q>", "検索文字列")
  .option("--pinned-repo <repo>", "pin された repo で絞る")
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: NotesListOptions) => {
    process.exit(await runNotesList(o));
  });

notes
  .command("get")
  .description("note 詳細 (GET /knowledge/notes/{note_id})")
  .argument("<note_id>", "note ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (noteId: string, o: Omit<NoteIdOptions, "noteId">) => {
    process.exit(await runNotesGet({ noteId, org: o.org, json: o.json }));
  });

notes
  .command("create")
  .description("note 作成 (POST /knowledge/notes)")
  .option("--title <title>", "note の名前")
  .option("--body <text>", "note 本文 (markdown)")
  .option("--body-file <path>", 'note 本文をファイルから読む ("-" で stdin)')
  .option("--trigger <text>", "note を使う条件の説明")
  .option("--folder-id <id>", "folder ID (notes folders の folder_id 列)")
  .option("--pinned-repo <repo>", "pin する repo")
  .option("--enabled", "有効化する")
  .option("--disabled", "無効化する")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: NoteCreateOptions) => {
    process.exit(await runNotesCreate(o));
  });

notes
  .command("update")
  .description("note 更新 (PUT /knowledge/notes/{note_id}。現在値に指定分をマージ)")
  .argument("<note_id>", "note ID")
  .option("--title <title>", "note の名前")
  .option("--body <text>", "note 本文 (markdown)")
  .option("--body-file <path>", 'note 本文をファイルから読む ("-" で stdin)')
  .option("--trigger <text>", "note を使う条件の説明")
  .option("--folder-id <id>", "folder ID")
  .option("--clear-folder", "folder の紐付けを外す")
  .option("--pinned-repo <repo>", "pin する repo")
  .option("--clear-pinned-repo", "pin を外す")
  .option("--enabled", "有効化する")
  .option("--disabled", "無効化する")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (noteId: string, o: Omit<NoteUpdateOptions, "noteId">) => {
    process.exit(await runNotesUpdate({ noteId, ...o }));
  });

notes
  .command("delete")
  .description("note 削除 (DELETE /knowledge/notes/{note_id})")
  .argument("<note_id>", "note ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (noteId: string, o: Omit<NoteIdOptions, "noteId">) => {
    process.exit(await runNotesDelete({ noteId, org: o.org, json: o.json }));
  });

const automations = program.command("automations").description("automations (org scope)");

automations
  .command("list")
  .description("automations 一覧 (GET /automations)")
  .addOption(orgOption())
  .addOption(limitOption())
  .option("--search <q>", "検索文字列")
  .option("--creator <id>", "作成者 (user_id / service_user_id) で絞る")
  .option("--event-type <type>", "トリガーの event_type で絞る (例: github:push)")
  .option(
    "--agent-type <type>",
    "action の agent type で絞る (繰り返し可。new_session/long_running/auto_triage/remediate_finding/triage_session/generic_assistant/incident_session/code_scan)",
    append,
    [],
  )
  .option("--enabled", "有効なものだけ")
  .option("--disabled", "無効なものだけ")
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: AutomationsListOptions) => {
    process.exit(await runAutomationsList(o));
  });

automations
  .command("get")
  .description("automation 詳細 (GET /automations/{automation_id})")
  .argument("<automation_id>", "automation ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (automationId: string, o: Omit<AutomationIdOptions, "automationId">) => {
    process.exit(await runAutomationGet({ automationId, org: o.org, json: o.json }));
  });

automations
  .command("create")
  .description("automation 作成 (POST /automations)")
  .option("--name <name>", "automation 名")
  .option("--run-as <who>", "organization / creator / service-user:<id>")
  .option("--trigger <event_type>", "トリガー event_type (繰り返し可。例: github:push)", append, [])
  .option("--prompt <text>", "start_session action のプロンプト")
  .option("--enabled", "有効化する")
  .option("--disabled", "無効化する")
  .option("--template-id <id>", "テンプレート ID (automations templates で確認)")
  .option("--metadata <k=v>", "metadata (繰り返し可)", append, [])
  .option("--body-json <json>", "AutomationCreateRequest 全体を JSON で渡す")
  .option("--body-file <path>", '同上をファイルから読む ("-" で stdin)')
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: AutomationCreateOptions) => {
    process.exit(await runAutomationCreate(o));
  });

automations
  .command("update")
  .description("automation 更新 (PATCH /automations/{automation_id})")
  .argument("<automation_id>", "automation ID")
  .option("--name <name>", "automation 名")
  .option("--enabled", "有効化する")
  .option("--disabled", "無効化する")
  .option("--body-json <json>", "AutomationUpdateRequest の差分を JSON で渡す")
  .option("--body-file <path>", '同上をファイルから読む ("-" で stdin)')
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (automationId: string, o: Omit<AutomationUpdateOptions, "automationId">) => {
    process.exit(await runAutomationUpdate({ automationId, ...o }));
  });

automations
  .command("delete")
  .description("automation 削除 (DELETE /automations/{automation_id}。soft delete)")
  .argument("<automation_id>", "automation ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (automationId: string, o: Omit<AutomationIdOptions, "automationId">) => {
    process.exit(await runAutomationDelete({ automationId, org: o.org, json: o.json }));
  });

automations
  .command("schemas")
  .description("トリガーのイベントスキーマ一覧 (GET /automations/schemas)")
  .option("--security-profile-id <id>", "security profile 前提でスキーマを解決する")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: AutomationSchemasOptions) => {
    process.exit(await runAutomationSchemas(o));
  });

automations
  .command("templates")
  .description("組み込みテンプレート一覧 (GET /automations/templates)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: AutomationTemplatesOptions) => {
    process.exit(await runAutomationTemplates(o));
  });

const schedules = program.command("schedules").description(`schedules (${DEPRECATED_NOTE})`);

const scheduleCommon = (cmd: Command) =>
  cmd
    .option("--name <name>", "schedule 名")
    .option("--prompt <text>", "起動する session への prompt")
    .option("--schedule-type <type>", "recurring / one_time")
    .option("--frequency <cron>", "繰り返しの cron 式 (recurring 用)")
    .option("--interval-count <n>", "cron の N 回ごとに実行", positiveInt)
    .option("--scheduled-at <datetime>", "one_time の実行時刻 (RFC3339)")
    .option("--agent <agent>", "devin / data_analyst")
    .option("--notify-on <when>", "always / failure / never")
    .option("--platform <platform>", "session の VM platform")
    .option("--playbook-id <id>", "playbook ID")
    .option("--skill-plugin <id>", "skill の plugin_identity (--skill-name と併用)")
    .option("--skill-name <name>", "skill 名 (--skill-plugin と併用)")
    .option("--tags <tag>", "session に付ける tag (繰り返し可)", append, [])
    .option("--slack-channel-id <id>", "通知先 Slack channel ID")
    .option("--slack-team-id <id>", "通知先 Slack team ID")
    .option("--target-devin-id <id>", "既存 session に紐付ける Devin ID")
    .option("--bypass-approval", "plan approval を skip する")
    .option("--body-json <json>", "リクエスト全体/差分を JSON で渡す (フラグとマージ、フラグ優先)")
    .option("--body-file <path>", '同上をファイルから読む ("-" で stdin)');

schedules
  .command("list")
  .description("schedules 一覧 (GET /schedules)")
  .addOption(orgOption())
  .addOption(limitOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: SchedulesListOptions) => {
    process.exit(await runSchedulesList(o));
  });

schedules
  .command("get")
  .description("schedule 詳細 (GET /schedules/{schedule_id})")
  .argument("<schedule_id>", "schedule ID (list の schedule_id 列)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (scheduleId: string, o: Omit<ScheduleIdOptions, "scheduleId">) => {
    process.exit(await runScheduleGet({ scheduleId, org: o.org, json: o.json }));
  });

scheduleCommon(schedules.command("create").description("schedule 作成 (POST /schedules)"))
  .option("--create-as-user-id <id>", "この user として作成する")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: ScheduleCreateOptions) => {
    process.exit(await runScheduleCreate(o));
  });

scheduleCommon(
  schedules.command("update").description("schedule 更新 (PATCH /schedules/{schedule_id})"),
)
  .argument("<schedule_id>", "schedule ID")
  .option("--enabled", "有効化する")
  .option("--disabled", "無効化する")
  .option("--run-as-user-id <id>", "実行 user を変更する")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (scheduleId: string, o: Omit<ScheduleUpdateOptions, "scheduleId">) => {
    process.exit(await runScheduleUpdate({ scheduleId, ...o }));
  });

schedules
  .command("delete")
  .description("schedule 削除 (DELETE /schedules/{schedule_id}。soft delete)")
  .argument("<schedule_id>", "schedule ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (scheduleId: string, o: Omit<ScheduleIdOptions, "scheduleId">) => {
    process.exit(await runScheduleDelete({ scheduleId, org: o.org, json: o.json }));
  });

// ---- sessions ----
// 一覧・insights のページサイズは API 上限の 200 を内部で使い、--limit は出力件数を絞る
// positiveInt / limitOption は上部の共有ヘルパーを使う (sessions 版は "出力する最大件数" だったが統一)

// 期間フィルタは Unix 秒か ISO 8601 (例: 2026-01-01) を受ける
const unixTime = (value: string): number => {
  if (/^\d+$/.test(value)) return Number(value);
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new InvalidArgumentError(`Unix 秒か ISO 8601 で指定する: ${value}`);
  return Math.floor(ms / 1000);
};

// 繰り返し指定できるオプション用。--tag a --tag b で ["a","b"] に貯める
const collect =
  <T>(parse: (v: string) => T) =>
  (v: string, prev: T[] = []): T[] => [...prev, parse(v)];

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (v: string): T => {
    if (!values.includes(v as T))
      throw new InvalidArgumentError(`選べるのは ${values.join(", ")}: ${v}`);
    return v as T;
  };

const SESSION_STATUSES = Object.values(SessionResponseStatus);
const SESSION_ORIGINS = Object.values(SessionResponseOrigin);
const DEVIN_MODES = Object.values(SessionCreateRequestDevinMode);

const repeatable = <T>(flags: string, desc: string, parse: (v: string) => T) =>
  new Option(flags, desc).argParser(collect(parse)).default([] as T[]);

// list / insights で共通のオプション群 (フィルタは API の SessionsQueryParams に対応。
// --status は API に無いのでクライアント側で絞る)
const addSessionListOptions = (cmd: Command) => {
  cmd
    .addOption(limitOption())
    .addOption(
      repeatable("--status <status>", "status で絞る (繰り返し可)", oneOf(SESSION_STATUSES)),
    )
    .addOption(new Option("--archived", "is_archived=true のみ").conflicts("active"))
    .addOption(new Option("--active", "is_archived=false のみ"))
    .addOption(repeatable("--tag <tag>", "タグで絞る (繰り返し可)", (v) => v))
    .addOption(
      repeatable("--origin <origin>", "origin で絞る (繰り返し可)", oneOf(SESSION_ORIGINS)),
    )
    .addOption(repeatable("--user <user_id>", "作成ユーザーで絞る (繰り返し可)", (v) => v))
    .addOption(repeatable("--repo <owner/repo>", "リポジトリで絞る (繰り返し可)", (v) => v))
    .addOption(
      new Option("--created-after <t>", "作成日時の下限 (Unix 秒か ISO 8601)").argParser(unixTime),
    )
    .addOption(
      new Option("--created-before <t>", "作成日時の上限 (Unix 秒か ISO 8601)").argParser(unixTime),
    )
    .addOption(
      new Option("--updated-after <t>", "更新日時の下限 (Unix 秒か ISO 8601)").argParser(unixTime),
    )
    .addOption(
      new Option("--updated-before <t>", "更新日時の上限 (Unix 秒か ISO 8601)").argParser(unixTime),
    )
    .addOption(orgOption())
    .option(JSON_FLAG, JSON_HELP);
};

// commander の opts (camelCase) を SessionFilterOptions に写す
const filterOpts = (opts: Record<string, unknown>): SessionFilterOptions => ({
  limit: opts.limit as number | undefined,
  status: opts.status as string[] | undefined,
  archived: opts.archived as boolean | undefined,
  active: opts.active as boolean | undefined,
  tags: opts.tag as string[] | undefined,
  origins: opts.origin as string[] | undefined,
  userIds: opts.user as string[] | undefined,
  repoNames: opts.repo as string[] | undefined,
  createdAfter: opts.createdAfter as number | undefined,
  createdBefore: opts.createdBefore as number | undefined,
  updatedAfter: opts.updatedAfter as number | undefined,
  updatedBefore: opts.updatedBefore as number | undefined,
  org: opts.org as string | undefined,
  json: opts.json === true,
});

const sessions = program
  .command("sessions")
  .description("Devin セッション (一覧・詳細・メッセージ・insights・作成・archive・タグ・削除)");

const sessionsListCmd = sessions
  .command("list")
  .description("セッション一覧 (cursor ページネーション。--limit で打ち切り)")
  .action(async (opts: Record<string, unknown>) => {
    process.exit(await runSessionsList(filterOpts(opts)));
  });
addSessionListOptions(sessionsListCmd);

sessions
  .command("get")
  .description("セッション詳細")
  .argument("<devin_id>", "session ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (devinId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSessionsGet({ devinId, org: opts.org, json: opts.json === true }));
  });

sessions
  .command("messages")
  .description("セッションのメッセージ一覧 (時系列)")
  .argument("<devin_id>", "session ID")
  .addOption(limitOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (devinId: string, opts: { limit?: number; org?: string; json?: boolean }) => {
    process.exit(
      await runSessionsMessages({
        devinId,
        limit: opts.limit,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

const sessionsInsightsCmd = sessions
  .command("insights")
  .description("セッションの insights。ID 省略時は組織全体の一覧")
  .argument("[devin_id]", "session ID (省略時は組織全体)")
  .action(async (devinId: string | undefined, opts: Record<string, unknown>) => {
    process.exit(await runSessionsInsights({ ...filterOpts(opts), devinId }));
  });
addSessionListOptions(sessionsInsightsCmd);

sessions
  .command("attachments")
  .description("セッションの添付一覧")
  .argument("<devin_id>", "session ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (devinId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(
      await runSessionsAttachments({ devinId, org: opts.org, json: opts.json === true }),
    );
  });

sessions
  .command("create")
  .description("セッションを作成する (実費が発生する)")
  .addHelpText("after", "\n--prompt - で stdin からプロンプトを読む。作成には ACU 課金が発生する")
  .requiredOption("--prompt <text>", "プロンプト ('-' で stdin)")
  .option("--title <title>", "タイトル")
  .option(
    "--repo <owner/repo>",
    "対象リポジトリ (繰り返し可)",
    collect((v) => v),
    [],
  )
  .option(
    "--tag <tag>",
    "タグ (繰り返し可)",
    collect((v) => v),
    [],
  )
  .option("--playbook-id <id>", "playbook ID")
  .option(
    "--attachment <url>",
    "添付 URL (繰り返し可)",
    collect((v) => v),
    [],
  )
  .addOption(new Option("--mode <mode>", "Devin モード").choices(DEVIN_MODES))
  .option("--max-acu <n>", "ACU 上限", positiveInt)
  .option("--platform <name>", "VM platform / outpost pool 名")
  .option("--bypass-approval", "safe mode の承認をバイパスする")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (opts: {
      prompt: string;
      title?: string;
      repo?: string[];
      tag?: string[];
      playbookId?: string;
      attachment?: string[];
      mode?: string;
      maxAcu?: number;
      platform?: string;
      bypassApproval?: boolean;
      org?: string;
      json?: boolean;
    }) => {
      const body: SessionCreateOptions = {
        prompt: opts.prompt,
        title: opts.title,
        repos: opts.repo,
        tags: opts.tag,
        playbookId: opts.playbookId,
        attachmentUrls: opts.attachment,
        devinMode: opts.mode,
        maxAcuLimit: opts.maxAcu,
        platform: opts.platform,
        bypassApproval: opts.bypassApproval,
        org: opts.org,
        json: opts.json === true,
      };
      process.exit(await runSessionsCreate(body));
    },
  );

sessions
  .command("archive")
  .description("セッションを archive する (実行中なら sleep させる)")
  .argument("<devin_id>", "session ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (devinId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSessionsArchive({ devinId, org: opts.org, json: opts.json === true }));
  });

// tags は get/add/set のサブコマンドだけを持つグループにする。
// グループ自身に --org/--json 等を持たせると、commander がサブコマンド名より先に
// 親のオプションとして食べてしまい、add/set に --org が届かない (実測で確認)
const sessionsTagsCmd = sessions
  .command("tags")
  .description("セッションのタグ (get で一覧・add で追加・set で全置換)");

sessionsTagsCmd
  .command("get")
  .description("タグ一覧")
  .argument("<devin_id>", "session ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (devinId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSessionsTagsGet({ devinId, org: opts.org, json: opts.json === true }));
  });

sessionsTagsCmd
  .command("add")
  .description("タグを追加する (既存タグと重複しない)")
  .argument("<devin_id>", "session ID")
  .argument("<tag...>", "タグ (1つ以上)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (devinId: string, tag: string[], opts: { org?: string; json?: boolean }) => {
    process.exit(
      await runSessionsTagsAdd({ devinId, tags: tag, org: opts.org, json: opts.json === true }),
    );
  });

sessionsTagsCmd
  .command("set")
  .description("タグを全置換する (引数なしで全タグ削除)")
  .argument("<devin_id>", "session ID")
  .argument("[tag...]", "タグ (省略時は空 = 全削除)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (devinId: string, tag: string[] | undefined, opts: { org?: string; json?: boolean }) => {
      process.exit(
        await runSessionsTagsSet({
          devinId,
          tags: tag ?? [],
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

sessions
  .command("delete")
  .description("セッションを終了する (破壊的。--yes 必須)")
  .argument("<devin_id>", "session ID")
  .option("--yes", "実際に DELETE を実行する (無いと dry-run で exit 2)")
  .option("--archive", "削除と同時に archive する")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (
      devinId: string,
      opts: { yes?: boolean; archive?: boolean; org?: string; json?: boolean },
    ) => {
      process.exit(
        await runSessionsDelete({
          devinId,
          yes: opts.yes,
          archive: opts.archive,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

program
  .command("completion")
  .description("シェル補完スクリプトを stdout に出す")
  .addArgument(new Argument("<shell>", "bash / zsh / fish").choices(SHELLS))
  .action(async (shell: Shell) => {
    process.exit(await runCompletion({ shell }));
  });

// --- members (v3beta1) ---
const members = program
  .command("members")
  .description("org メンバー (v3beta1。list/get/idp-users)");

members
  .command("list")
  .description("メンバー一覧 (cursor pagination)")
  .addOption(limitOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { limit?: number; org?: string; json?: boolean }) => {
    process.exit(
      await runMembersList({ limit: opts.limit, org: opts.org, json: opts.json === true }),
    );
  });

members
  .command("get")
  .description("メンバー詳細 (直接 + IDP 由来の role を返す)")
  .argument("<user_id>", "ユーザー ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (userId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runMembersGet({ userId, org: opts.org, json: opts.json === true }));
  });

members
  .command("idp-users")
  .description("IDP グループ由来のメンバー一覧")
  .addOption(limitOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { limit?: number; org?: string; json?: boolean }) => {
    process.exit(
      await runMembersIdpUsers({ limit: opts.limit, org: opts.org, json: opts.json === true }),
    );
  });

// --- playbooks ---
const playbooks = program.command("playbooks").description("org の playbook CRUD");

playbooks
  .command("list")
  .description("playbook 一覧 (cursor pagination)")
  .addOption(limitOption())
  .option("--include-enterprise", "enterprise 共通の playbook も含める")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (opts: { limit?: number; includeEnterprise?: boolean; org?: string; json?: boolean }) => {
      process.exit(
        await runPlaybooksList({
          limit: opts.limit,
          includeEnterprise: opts.includeEnterprise,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

playbooks
  .command("get")
  .description("playbook 詳細")
  .argument("<playbook_id>", "playbook ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (playbookId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runPlaybookGet({ playbookId, org: opts.org, json: opts.json === true }));
  });

// create / update は同じ項目を取る (PUT は全項目置き換えなので title/body は両方必須。
// 必須判定は writeBody が exit 2 で行う)
const playbookWriteOptions = (cmd: Command) =>
  cmd
    .option("--title <title>", "playbook のタイトル")
    .option("--body <text>", "playbook の本文 (--body-file と排他)")
    .option("--body-file <path>", 'playbook の本文をファイルから読む ("-" で stdin)')
    .option("--macro <macro>", "playbook macro (! で始まる識別子)")
    .option("--structured-output-schema <json>", "structured output の JSON Schema")
    .addOption(orgOption())
    .option(JSON_FLAG, JSON_HELP);

playbookWriteOptions(
  playbooks.command("create").description("playbook を作成 (--title/--body 必須)"),
).action(async (opts: PlaybookWriteOptions) => {
  process.exit(await runPlaybookCreate({ ...opts, json: opts.json === true }));
});

playbookWriteOptions(
  playbooks
    .command("update")
    .description("playbook を更新 (PUT。title/body は全項目置き換えなので必須)")
    .argument("<playbook_id>", "playbook ID"),
).action(async (playbookId: string, opts: PlaybookWriteOptions) => {
  process.exit(await runPlaybookUpdate({ ...opts, playbookId, json: opts.json === true }));
});

playbooks
  .command("delete")
  .description("playbook を削除")
  .argument("<playbook_id>", "playbook ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (playbookId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runPlaybookDelete({ playbookId, org: opts.org, json: opts.json === true }));
  });

// --- pr-reviews ---
const prReviews = program
  .command("pr-reviews")
  .description("PR review の起動・参照 (一覧 API は無く PR 単位)");

prReviews
  .command("get")
  .description("PR の最新 review を取得 (pr_url 必須)")
  .argument("<pr_url>", "PR の URL (例: https://github.com/owner/repo/pull/123)")
  .option("--commit-sha <sha>", "commit SHA (省略時は PR の head)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (prUrl: string, opts: { commitSha?: string; org?: string; json?: boolean }) => {
    process.exit(
      await runPrReviewGet({
        prUrl,
        commitSha: opts.commitSha,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

prReviews
  .command("create")
  .description("PR の review を起動")
  .argument("<pr_url>", "PR の URL")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (prUrl: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runPrReviewCreate({ prUrl, org: opts.org, json: opts.json === true }));
  });

// --- attachments ---
const attachments = program
  .command("attachments")
  .description("org attachments の upload/download");

attachments
  .command("upload")
  .description("ファイルを attachment としてアップロード (multipart)")
  .argument("<file>", "アップロードするファイル")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (file: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runAttachmentUpload({ file, org: opts.org, json: opts.json === true }));
  });

attachments
  .command("download")
  .description("attachment をダウンロード (--out 省略時はバイナリを stdout に出す)")
  .argument("<uuid>", "attachment の uuid")
  .argument("<name>", "attachment の name")
  .option("--out <file>", "保存先ファイル")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (uuid: string, name: string, opts: { out?: string; org?: string; json?: boolean }) => {
      process.exit(
        await runAttachmentDownload({
          uuid,
          name,
          out: opts.out,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

// --- security-profiles (v3beta1) ---
const securityProfiles = program
  .command("security-profiles")
  .description("org の security profile CRUD (v3beta1)");

securityProfiles
  .command("list")
  .description("security profile 一覧 (cursor pagination)")
  .addOption(limitOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { limit?: number; org?: string; json?: boolean }) => {
    process.exit(
      await runSecurityProfilesList({ limit: opts.limit, org: opts.org, json: opts.json === true }),
    );
  });

securityProfiles
  .command("get")
  .description("security profile 詳細")
  .argument("<profile_id>", "profile ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (profileId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(
      await runSecurityProfileGet({ profileId, org: opts.org, json: opts.json === true }),
    );
  });

// create / update で共通の項目フラグ。update は指定した項目だけを PATCH する
const profileFieldOptions = (cmd: Command) =>
  cmd
    .option("--name <name>", "profile 名")
    .addOption(
      new Option("--enforcement-level <level>", "enforcement").choices([
        "recommended",
        "mandatory",
      ]),
    )
    .addOption(
      new Option("--git-access-level <level>", "git access").choices(["read_only", "read_write"]),
    )
    .option("--devin-mcp-read-only <bool>", "read-only Devin MCP tools のみ許可", boolValue)
    .option("--remove-github-cli-token <bool>", "GitHub CLI token を session から除く", boolValue)
    .option("--mcp-server <slug>", "許可する MCP server の slug (繰り返し可)", append, [])
    .option("--clear-mcp-config", "mcp_config を解除 (update のみ意味を持つ)")
    .option("--net-policy-json <json>", "net_policy を JSON object か null で指定")
    .option("--slack-channel-access-json <json>", "slack_channel_access を JSON で指定")
    .option("--teams-channel-access-json <json>", "teams_channel_access を JSON で指定")
    .addOption(
      new Option("--slack-dm-scope <scope>", "Slack DM scope (update では null で解除)").choices([
        "disabled",
        "org_members",
        "workspace",
        "null",
      ]),
    )
    .addOption(
      new Option("--teams-dm-scope <scope>", "Teams DM scope (update では null で解除)").choices([
        "disabled",
        "installed_users",
        "null",
      ]),
    )
    .addOption(
      new Option(
        "--teams-group-chat-scope <scope>",
        "Teams group chat scope (update では null で解除)",
      ).choices(["disabled", "origin_chat", "null"]),
    );

// create は --name 必須 (runSecurityProfileCreate が exit 2 で検査)。
// update は指定した項目だけを PATCH する
profileFieldOptions(
  securityProfiles.command("create").description("security profile を作成 (--name 必須)"),
)
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: SecurityProfileWriteOptions) => {
    process.exit(await runSecurityProfileCreate({ ...opts, json: opts.json === true }));
  });

profileFieldOptions(
  securityProfiles
    .command("update")
    .description("security profile を更新 (PATCH。指定した項目だけ送る)")
    .argument("<profile_id>", "profile ID"),
)
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (profileId: string, opts: SecurityProfileWriteOptions) => {
    process.exit(await runSecurityProfileUpdate({ ...opts, profileId, json: opts.json === true }));
  });

securityProfiles
  .command("delete")
  .description("security profile を削除")
  .argument("<profile_id>", "profile ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (profileId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(
      await runSecurityProfileDelete({ profileId, org: opts.org, json: opts.json === true }),
    );
  });

// --- security-profile-settings (v3beta1) ---
const securityProfileSettings = program
  .command("security-profile-settings")
  .description("org の security profile 既定値 (v3beta1)");

securityProfileSettings
  .command("get")
  .description("default / automations_default の現在値")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { org?: string; json?: boolean }) => {
    process.exit(await runSecurityProfileSettingsGet({ org: opts.org, json: opts.json === true }));
  });

securityProfileSettings
  .command("update")
  .description("default / automations_default を更新 (PATCH。省略した側は変更しない)")
  .addOption(
    new Option("--default <selection>", "default の selection").choices([
      "inherit",
      "none",
      "profile",
    ]),
  )
  .option("--default-profile <id>", "--default profile のときの profile ID")
  .addOption(
    new Option("--automations-default <selection>", "automations_default の selection").choices([
      "inherit",
      "none",
      "profile",
    ]),
  )
  .option("--automations-default-profile <id>", "--automations-default profile の profile ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (opts: {
      default?: string;
      defaultProfile?: string;
      automationsDefault?: string;
      automationsDefaultProfile?: string;
      org?: string;
      json?: boolean;
    }) => {
      process.exit(
        await runSecurityProfileSettingsUpdate({
          default: opts.default,
          defaultProfile: opts.defaultProfile,
          automationsDefault: opts.automationsDefault,
          automationsDefaultProfile: opts.automationsDefaultProfile,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

// --- default-platform (v3beta1) ---
const defaultPlatform = program
  .command("default-platform")
  .description("新規 session の既定 platform (v3beta1)");

defaultPlatform
  .command("get")
  .description("現在の既定 platform")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { org?: string; json?: boolean }) => {
    process.exit(await runDefaultPlatformGet({ org: opts.org, json: opts.json === true }));
  });

defaultPlatform
  .command("set")
  .description("既定 platform を設定 (--clear で解除)")
  .option("--platform <label>", "hosted platform ラベル (例: linux) か outpost pool 名")
  .option("--outpost-pool-id <id>", "共有 outpost pool の ID")
  .option("--clear", "既定を解除 (platform/outpost_pool_id を両方 null に)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (opts: {
      platform?: string;
      outpostPoolId?: string;
      clear?: boolean;
      org?: string;
      json?: boolean;
    }) => {
      process.exit(
        await runDefaultPlatformSet({
          platform: opts.platform,
          outpostPoolId: opts.outpostPoolId,
          clear: opts.clear,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

// 1 は相手が否と答えた、2 は使い方・秘密・通信の誤り、70 は想定外の内部エラー
program.parseAsync().catch((e: unknown) => {
  process.stderr.write(`error: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(70);
});
