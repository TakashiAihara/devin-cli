import { formatIsoUtc } from "../dates.ts";
import { cursorPages } from "../api/paginate.ts";
import {
  automation,
  automationSchemas,
  automationTemplates,
  automations,
  createAutomation,
  deleteAutomation,
  updateAutomation,
  type AutomationCreateRequest,
  type AutomationResponse,
  type AutomationSchemasResponse,
  type AutomationTemplatesResponse,
  type AutomationUpdateRequest,
  type GetOrganizationsOrgIdAutomationsParams,
  type GetOrganizationsOrgIdAutomationsSchemasParams,
} from "../api/endpoints.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cellText, die, enabledDisabled, guard, json, print } from "../lib.ts";
import { hasJsonBody, jsonBody } from "./input.ts";

export type AutomationsListOptions = {
  org?: string;
  json: boolean;
  limit?: number;
  search?: string;
  creator?: string;
  eventType?: string;
  agentType?: string[];
  enabled?: boolean;
  disabled?: boolean;
};
export type AutomationIdOptions = { automationId: string; org?: string; json: boolean };
export type AutomationCreateOptions = {
  org?: string;
  json: boolean;
  name?: string;
  runAs?: string;
  trigger?: string[];
  prompt?: string;
  enabled?: boolean;
  disabled?: boolean;
  templateId?: string;
  metadata?: string[];
  bodyJson?: string;
  bodyFile?: string;
};
export type AutomationUpdateOptions = {
  automationId: string;
  org?: string;
  json: boolean;
  name?: string;
  enabled?: boolean;
  disabled?: boolean;
  bodyJson?: string;
  bodyFile?: string;
};
export type AutomationSchemasOptions = {
  org?: string;
  json: boolean;
  securityProfileId?: string;
};
export type AutomationTemplatesOptions = { org?: string; json: boolean };

// run_as の CLI 表記 → API の discriminated union
// organization / creator / service-user:<id>
export function runAsObject(v: string): AutomationCreateRequest["run_as"] {
  if (v === "organization") return { type: "organization" };
  if (v === "creator") return { type: "creator" };
  const m = /^service-user:(\S+)$/.exec(v);
  if (m?.[1]) return { type: "service_user", service_user_id: m[1] };
  return die("--run-as は organization / creator / service-user:<id> のいずれか", 2);
}

// --metadata key=value (繰り返し可) をオブジェクトにする
function parseMetadata(pairs: string[] | undefined): Record<string, string> | undefined {
  if (!pairs || pairs.length === 0) return undefined;
  const m: Record<string, string> = {};
  for (const p of pairs) {
    const i = p.indexOf("=");
    if (i <= 0) return die(`--metadata は key=value 形式で指定する: ${p}`, 2);
    m[p.slice(0, i)] = p.slice(i + 1);
  }
  return m;
}

// AutomationResponse のネストした部分を TSV 1 セルに畳む helpers
const runAsText = (runAs: unknown): string => {
  if (!runAs || typeof runAs !== "object") return "-";
  const r = runAs as Record<string, unknown>;
  const type = typeof r.type === "string" ? r.type : "service_user";
  const id = r.service_user_id;
  return typeof id === "string" && id ? `${type}:${id}` : type;
};

const actorText = (a: AutomationResponse["created_by"]): string => {
  if (!a) return "-";
  return `${cellText(a.type)}:${cellText(a.id)}`;
};

const triggersText = (a: AutomationResponse): string =>
  cellText(a.triggers.map((t) => t.event_type).join(","));

const actionsText = (a: AutomationResponse): string =>
  cellText(a.actions.map((x) => (x as { type?: string }).type ?? "?").join(","));

const isoOrDash = (v: number | null | undefined): string =>
  typeof v === "number" ? formatIsoUtc(v) : "-";

const metadataText = (m: AutomationResponse["metadata"]): string => {
  if (!m) return "-";
  const entries = Object.entries(m).toSorted(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return "-";
  return cellText(entries.map(([k, v]) => `${k}=${v}`).join(","));
};

const AUTOMATION_LIST_HEADER =
  "automation_id\tname\tenabled\trun_as\ttemplate_id\tnext_run_at\tupdated_at\ttriggers\tactions";
function automationListLines(items: AutomationResponse[]): string[] {
  const lines = [AUTOMATION_LIST_HEADER];
  for (const a of items)
    lines.push(
      [
        cellText(a.automation_id),
        cellText(a.name),
        cellText(a.enabled),
        runAsText(a.run_as),
        cellText(a.template_id),
        isoOrDash(a.next_run_at),
        isoOrDash(a.updated_at),
        triggersText(a),
        actionsText(a),
      ].join("\t"),
    );
  return lines;
}

// 単体の automation。conditions / session 設定などの深いネストは --json に任せ、
// ここでは一覧化に使えるスカラーと要約だけ出す
const AUTOMATION_DETAIL_HEADER =
  "automation_id\tname\tenabled\trun_as\ttemplate_id\tcreated_at\tupdated_at\tnext_run_at\tcreated_by\tlast_invocation\ttriggers\tactions\tmetadata";
function automationDetailLines(a: AutomationResponse): string[] {
  const inv = a.last_invocation;
  return [
    AUTOMATION_DETAIL_HEADER,
    [
      cellText(a.automation_id),
      cellText(a.name),
      cellText(a.enabled),
      runAsText(a.run_as),
      cellText(a.template_id),
      isoOrDash(a.created_at),
      isoOrDash(a.updated_at),
      isoOrDash(a.next_run_at),
      actorText(a.created_by),
      inv ? `${cellText(inv.status)}@${isoOrDash(inv.fired_at)}` : "-",
      triggersText(a),
      actionsText(a),
      metadataText(a.metadata),
    ].join("\t"),
  ];
}

const emitAutomation = (a: AutomationResponse, asJson: boolean): number => {
  if (asJson) {
    json(a);
    return 0;
  }
  for (const line of automationDetailLines(a)) print(line);
  return 0;
};

const emitAutomations = (items: AutomationResponse[], asJson: boolean): number => {
  if (asJson) {
    json({ items });
    return 0;
  }
  for (const line of automationListLines(items)) print(line);
  return 0;
};

// GetOrganizationsOrgIdAutomationsParams["agent_types"] の enum。API 側でも検査されるが
// 使い方の誤りは exit 2 にしたいので CLI でも見る
const AGENT_TYPES = [
  "new_session",
  "long_running",
  "auto_triage",
  "remediate_finding",
  "triage_session",
  "generic_assistant",
  "incident_session",
  "code_scan",
] as const;

export const runAutomationsList = guard(async (o: AutomationsListOptions) => {
  const en = enabledDisabled(o);
  for (const t of o.agentType ?? [])
    if (!(AGENT_TYPES as readonly string[]).includes(t))
      return die(`--agent-type は ${AGENT_TYPES.join(" / ")} のいずれか: ${t}`, 2);
  const params: GetOrganizationsOrgIdAutomationsParams = {
    search: o.search,
    creator_id: o.creator,
    event_type: o.eventType,
    agent_types:
      o.agentType && o.agentType.length > 0
        ? (o.agentType as GetOrganizationsOrgIdAutomationsParams["agent_types"])
        : undefined,
    enabled: en,
  };
  const orgId = await resolveOrgId(o.org);
  const items = await cursorPages(
    (after, first) => automations(orgId, { ...params, after, first }),
    o.limit,
  );
  return emitAutomations(items, o.json);
});

export const runAutomationGet = guard(async (o: AutomationIdOptions) => {
  const orgId = await resolveOrgId(o.org);
  const a = await automation(orgId, o.automationId);
  return emitAutomation(a, o.json);
});

// create は 2 系統:
//   フラグ指定: --name --run-as --trigger(繰返) --prompt で start_session action を組み立てる
//   --body-json/--body-file: AutomationCreateRequest 全体を JSON で渡す (こちらが優先。
//     --name/--enabled/--template-id の上書きだけ併用できる)
export const runAutomationCreate = guard(async (o: AutomationCreateOptions) => {
  const en = enabledDisabled(o);
  let body: AutomationCreateRequest;
  const jb = jsonBody(o);
  const hasJson = hasJsonBody(o);
  if (hasJson) {
    // JSON 指定時は構造を決めるフラグ (trigger/prompt/run-as/metadata) との併用を禁じる
    if (
      o.runAs !== undefined ||
      (o.trigger !== undefined && o.trigger.length > 0) ||
      o.prompt !== undefined ||
      (o.metadata !== undefined && o.metadata.length > 0)
    )
      die(
        "--body-json/--body-file 指定時は --run-as/--trigger/--prompt/--metadata と併用できない",
        2,
      );
    const merged: Record<string, unknown> = { ...jb };
    if (o.name !== undefined) merged.name = o.name;
    if (en !== undefined) merged.enabled = en;
    if (o.templateId !== undefined) merged.template_id = o.templateId;
    body = merged as unknown as AutomationCreateRequest;
  } else {
    const missing: string[] = [];
    if (o.name === undefined || o.name === "") missing.push("--name");
    if (o.runAs === undefined || o.runAs === "") missing.push("--run-as");
    if (o.prompt === undefined || o.prompt === "") missing.push("--prompt");
    if (o.trigger === undefined || o.trigger.length === 0) missing.push("--trigger");
    if (missing.length > 0) return die(`必須オプションが無い: ${missing.join(", ")}`, 2);
    body = {
      name: o.name as string,
      run_as: runAsObject(o.runAs as string),
      triggers: (o.trigger as string[]).map((t) => ({
        event_type: t,
      })) as AutomationCreateRequest["triggers"],
      actions: [{ type: "start_session", prompt: o.prompt as string }],
    };
    if (en !== undefined) body.enabled = en;
    if (o.templateId !== undefined) body.template_id = o.templateId;
    const md = parseMetadata(o.metadata);
    if (md !== undefined) body.metadata = md;
  }
  const orgId = await resolveOrgId(o.org);
  const a = await createAutomation(orgId, body);
  return emitAutomation(a, o.json);
});

// update は PATCH。--name/--enabled と --body-json/--body-file (任意フィールド) を浅くマージする
export const runAutomationUpdate = guard(async (o: AutomationUpdateOptions) => {
  const en = enabledDisabled(o);
  const patch: Record<string, unknown> = { ...jsonBody(o) };
  if (o.name !== undefined) patch.name = o.name;
  if (en !== undefined) patch.enabled = en;
  if (Object.keys(patch).length === 0)
    return die("更新するフィールドを指定する (--name/--enabled/--body-json/--body-file)", 2);
  const orgId = await resolveOrgId(o.org);
  const a = await updateAutomation(orgId, o.automationId, patch as AutomationUpdateRequest);
  return emitAutomation(a, o.json);
});

export const runAutomationDelete = guard(async (o: AutomationIdOptions) => {
  const orgId = await resolveOrgId(o.org);
  const a = await deleteAutomation(orgId, o.automationId);
  return emitAutomation(a, o.json);
});

const netPolicyText = (p: AutomationSchemasResponse["default_net_policy"]): string => {
  if (!p) return "-";
  const dests = p.allow.map((d) => {
    const r = d as unknown as Record<string, unknown>;
    return cellText(r.hostname ?? r.ipv4 ?? r.ipv6);
  });
  return cellText(dests.join(","));
};

// schemas は巨大な構造化レスポンス。TSV ではサマリ + イベント一覧 (source/event_type/name/category/replies)
// まで出し、fields の中身は --json に任せる
function schemaLines(s: AutomationSchemasResponse): string[] {
  const lines = ["field\tvalue"];
  lines.push(`update_semantics\t${cellText(s.update_semantics)}`);
  lines.push(`skills_serve_playbooks\t${cellText(s.skills_serve_playbooks)}`);
  lines.push(`script_check_available\t${cellText(s.script_check_available)}`);
  lines.push(`default_fallback_devin_mode\t${cellText(s.default_fallback_devin_mode)}`);
  lines.push(`available_devin_modes\t${cellText((s.available_devin_modes ?? []).join(","))}`);
  lines.push(`security_profile\t${cellText(s.security_profile?.name)}`);
  lines.push(`default_net_policy\t${netPolicyText(s.default_net_policy)}`);
  lines.push("source\tevent_type\tname\tcategory\tsupported_replies");
  const sources = Object.entries(s.sources ?? {}).toSorted(([a], [b]) => a.localeCompare(b));
  for (const [source, events] of sources) {
    for (const ev of Object.values(events).toSorted((a, b) => a.name.localeCompare(b.name)))
      lines.push(
        [
          cellText(source),
          cellText(ev.event_type),
          cellText(ev.name),
          cellText(ev.category),
          cellText(ev.supported_replies.join(",")),
        ].join("\t"),
      );
  }
  return lines;
}

export const runAutomationSchemas = guard(async (o: AutomationSchemasOptions) => {
  const params: GetOrganizationsOrgIdAutomationsSchemasParams = {
    security_profile_id: o.securityProfileId,
  };
  const orgId = await resolveOrgId(o.org);
  const s = await automationSchemas(orgId, params);
  if (o.json) {
    json(s);
    return 0;
  }
  for (const line of schemaLines(s)) print(line);
  return 0;
});

const TEMPLATE_HEADER =
  "template_id\tname\tcategory\tfeatured\trequired_integrations\trequired_mcps\tdocs_url";
function templateLines(t: AutomationTemplatesResponse): string[] {
  const lines = [TEMPLATE_HEADER];
  for (const x of t.templates)
    lines.push(
      [
        cellText(x.template_id),
        cellText(x.name),
        cellText(x.category),
        cellText(x.featured),
        cellText(x.required_integrations.join(",")),
        cellText(x.required_mcps.join(",")),
        cellText(x.docs_url),
      ].join("\t"),
    );
  return lines;
}

export const runAutomationTemplates = guard(async (o: AutomationTemplatesOptions) => {
  const orgId = await resolveOrgId(o.org);
  const t = await automationTemplates(orgId);
  if (o.json) {
    json(t);
    return 0;
  }
  for (const line of templateLines(t)) print(line);
  return 0;
});
