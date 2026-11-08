// 偽の Devin API。/v3/self と org scope の consumption/metrics に canned JSON を返す。
// 認証: /v3/* は Authorization: Bearer cog_... を検査する (/presigned/ は attachment の
// リダイレクト先なので認証なしで返す — 本物の presigned URL も credential を持たない)
export const API_KEY = "cog_test-key";

export const SELF_PAT = {
  principal_type: "pat_user",
  user_id: "user-1",
  user_name: "Test User",
  api_key_id: "key-1",
  api_key_name: "test-pat",
  org_id: "org-self",
  devin_sessions_org_id: null,
  primary_billing_org_id: "org-billing",
};

export const SELF_SERVICE_USER = {
  principal_type: "service_user",
  service_user_id: "svc-1",
  service_user_name: "ci-bot",
  org_id: "org-svc",
};

export const CONSUMPTION = {
  total_acus: 3.5,
  consumption_by_date: [
    {
      date: 1767254400, // 2026-01-01T08:00:00Z = UTC-8 の 2026-01-01
      acus: 1.5,
      acus_by_product: { devin: 1.0, cascade: 0.5, terminal: 0, automation: null, review: null },
    },
    {
      date: 1767340800, // 2026-01-02T08:00:00Z = UTC-8 の 2026-01-02
      acus: 2.0,
      acus_by_product: { devin: 1.5, cascade: 0.25, terminal: 0.25, automation: 0, review: null },
    },
  ],
};

export const METRICS_USAGE = {
  sessions_count: 12,
  searches_count: 34,
  prs_created_count: 5,
  prs_merged_count: 3,
};

export const METRICS_SESSIONS = {
  sessions_created_count: 12,
  sessions_created_by_size: { s: 6, m: 4, l: 2, xl: 0 },
  sessions_created_by_origin: { webapp: 5, api: 4, slack: 2, automation: 1 },
  sessions_created_with_playbook_count: 3,
  sessions_created_with_search_count: 7,
  sessions_with_merged_prs_count: 2,
  sessions_with_merged_prs_by_size: { s: 1, m: 1, l: 0, xl: 0 },
  avg_acus_per_session: 0.29,
};

export const METRICS_PRS = {
  prs_created_count: 5,
  prs_opened_count: 4,
  prs_merged_count: 3,
  prs_closed_count: 1,
  prs_taken_over_count: 2,
  prs_taken_over_opened_count: 1,
  prs_taken_over_merged_count: 1,
  prs_taken_over_closed_count: 0,
};

export const METRICS_SEARCHES = { searches_created_count: 34 };

// metrics のバケットは UTC 日 (実測: start_time % 86400 === 0)。00:00Z 起点なので
// UTC-8 で整形すると 1 日ずれる — この fixture がその誤りを検出できる
export const METRICS_ACTIVE_USERS = [
  { start_time: 1767225600, end_time: 1767311999, active_users: 2 }, // 2026-01-01T00:00Z..23:59:59Z
  { start_time: 1767312000, end_time: 1767398399, active_users: 3 }, // 2026-01-02T00:00Z..23:59:59Z
];

// --- members (v3beta1) ---
// members/users は 2 ページに分かれる (after=cur-2 で 2 ページ目)。cursor 追跡と --limit を試せる
export const MEMBER_USER_1 = {
  user_id: "user-1",
  email: "alice@example.com",
  name: "Alice",
  role_assignments: [
    {
      org_id: "org-x",
      role: { role_id: "role-admin", role_name: "Admin", role_type: "org" },
    },
  ],
};
export const MEMBER_USER_2 = {
  user_id: "user-2",
  email: "bob@example.com",
  name: "Bob",
  role_assignments: [{ role: { role_id: "role-member", role_name: "Member", role_type: "org" } }],
};
export const MEMBER_DETAIL = {
  ...MEMBER_USER_1,
  idp_role_assignments: [
    {
      idp_group_name: "eng-admins",
      org_id: "org-x",
      role: { role_id: "role-admin", role_name: "Admin", role_type: "org" },
    },
  ],
};
export const IDP_USER = {
  user_id: "user-9",
  email: "carol@example.com",
  name: "Carol",
  idp_role_assignments: [
    {
      idp_group_name: "sso-admins",
      role: { role_id: "role-admin", role_name: "Admin", role_type: "org" },
    },
  ],
};

// --- playbooks ---
export const PLAYBOOK = {
  playbook_id: "pb-1",
  title: "My Playbook",
  macro: "!my",
  body: "Do the thing",
  access_type: "org",
  org_id: "org-x",
  created_by: "user-1",
  created_at: 1767225600,
  updated_at: 1767312000,
  structured_output_schema: null,
};
export const PLAYBOOK_2 = {
  ...PLAYBOOK,
  playbook_id: "pb-2",
  title: "Second",
  macro: null,
  access_type: "enterprise",
  org_id: null,
};

// --- pr-reviews ---
export const PR_REVIEW = {
  commit_sha: "abc123def456",
  created_at: "2026-01-03T04:05:06Z",
  pr_number: 42,
  repo_path: "github.com/owner/repo",
  status: "completed",
};

// --- attachments ---
export const ATTACHMENT = {
  attachment_id: "att-1",
  name: "file.bin",
  url: "https://files.example.com/att-1",
};
// 0xFF を含むバイト列。--out のバイト完全一致を検証するためのもの
export const PRESIGNED_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0x00, 0x61]);

// --- security-profiles (v3beta1) ---
export const SECURITY_PROFILE = {
  profile_id: "sp-1",
  org_id: "org-x",
  name: "Baseline",
  enforcement_level: "recommended",
  git_access_level: "read_only",
  devin_mcp_read_only: false,
  remove_github_cli_token: true,
  mcp_config: { servers: ["github"] },
  net_policy: { allow: [{ hostname: "*.github.com" }] },
  slack_dm_scope: null,
  teams_dm_scope: null,
  teams_group_chat_scope: null,
  created_at: 1767225600,
  updated_at: 1767312000,
};
export const SECURITY_PROFILE_SETTINGS = {
  default: { selection: "profile", profile_id: "sp-1", profile_scope: "org" },
  automations_default: { selection: "inherit" },
};
export const DEFAULT_PLATFORM = {
  platform: "linux",
  outpost_pool_id: null,
  outpost_pool_name: null,
};

// ---- knowledge notes ----

export const KNOWLEDGE_FOLDERS = {
  folders: [
    { folder_id: "fld-1", name: "Docs", path: "docs", note_count: 2, parent_folder_id: null },
    {
      folder_id: "fld-2",
      name: "Runbooks",
      path: "docs/runbooks",
      note_count: 1,
      parent_folder_id: "fld-1",
    },
    {
      folder_id: "fld-3",
      name: "Snippets",
      path: "snippets",
      note_count: 0,
      parent_folder_id: null,
    },
  ],
  root_note_count: 3,
};

const NOTE_BASE = {
  access_type: "org",
  folder_id: "fld-1",
  folder_path: "docs",
  is_enabled: true,
  macro: null,
  org_id: "org-x",
  pinned_repo: null,
};

export const KNOWLEDGE_NOTE = {
  ...NOTE_BASE,
  note_id: "note-1",
  name: "Auth notes",
  body: "# Auth\n\nUse SSO.",
  trigger: "when asked about auth",
  created_at: 1767225600, // 2026-01-01T00:00:00Z
  updated_at: 1767312000, // 2026-01-02T00:00:00Z
};

// 3 件にしてページング (fake は 1 ページ最大 2 件) を必ず通す
export const KNOWLEDGE_NOTES = [
  KNOWLEDGE_NOTE,
  {
    ...NOTE_BASE,
    note_id: "note-2",
    name: "Billing FAQ",
    body: "billing body",
    trigger: "billing",
    folder_id: null,
    folder_path: "",
    created_at: 1767225600,
    updated_at: 1767225600,
  },
  {
    ...NOTE_BASE,
    note_id: "note-3",
    name: "Deploy steps",
    body: "deploy body",
    trigger: "deploy",
    folder_id: "fld-2",
    folder_path: "docs/runbooks",
    pinned_repo: "org/repo",
    macro: "!deploy",
    created_at: 1767225600,
    updated_at: 1767225600,
  },
];

// ---- automations ----

export const AUTOMATION = {
  automation_id: "auto-1",
  name: "Nightly triage",
  enabled: true,
  run_as: { type: "organization" },
  template_id: null,
  created_at: 1767225600,
  updated_at: 1767312000,
  next_run_at: 1767400000,
  created_by: { type: "user", id: "user-1", name: "Test User" },
  last_edited_by: null,
  last_invocation: { fired_at: 1767312000, status: "succeeded" },
  metadata: { team: "infra" },
  triggers: [
    { event_type: "schedule:recurring", trigger_id: "trig-1", conditions: null, replies: [] },
  ],
  actions: [{ type: "start_session", prompt: "do the thing" }],
};

export const AUTOMATIONS = [
  AUTOMATION,
  {
    ...AUTOMATION,
    automation_id: "auto-2",
    name: "PR review",
    enabled: false,
    run_as: { type: "service_user", service_user_id: "svc-1" },
    template_id: "tpl-1",
    next_run_at: null,
    last_invocation: null,
    metadata: {},
    triggers: [{ event_type: "github:pull_request", trigger_id: "trig-2" }],
    actions: [{ type: "start_session", prompt: "review this PR" }],
  },
  {
    ...AUTOMATION,
    automation_id: "auto-3",
    name: "Slack watcher",
    enabled: true,
    run_as: { type: "creator" },
    created_by: { type: "service_user", id: "svc-9", name: null },
    triggers: [{ event_type: "slack:message", trigger_id: "trig-3" }],
    actions: [
      {
        type: "monitor_session",
        setup_prompt: "watch",
        slack_monitor_config: { source_channel_id: "C1" },
      },
    ],
  },
];

export const AUTOMATION_SCHEMAS = {
  skills_serve_playbooks: true,
  default_net_policy: { allow: [{ hostname: "git-manager.devin.ai" }] },
  security_profile: null,
  update_semantics: "merge_patch",
  available_devin_modes: ["normal", "fast"],
  default_fallback_devin_mode: "normal",
  script_check_available: true,
  sources: {
    github: {
      push: {
        event_type: "github:push",
        name: "Push",
        category: "github",
        supported_replies: ["post_response"],
        fields: {
          "repository.full_name": {
            type: "github_repo",
            label: "Repository",
            required: true,
          },
        },
      },
      pull_request: {
        event_type: "github:pull_request",
        name: "Pull request",
        category: "github",
        supported_replies: ["post_response", "attach_thread"],
        fields: {},
      },
    },
    schedule: {
      recurring: {
        event_type: "schedule:recurring",
        name: "Recurring schedule",
        category: "schedule",
        supported_replies: [],
        fields: {},
      },
    },
  },
};

export const AUTOMATION_TEMPLATES = {
  templates: [
    {
      template_id: "monitor-bugs-slack",
      name: "Triage Bug Reports",
      description: "Watches a Slack channel for bug reports.",
      category: "Monitoring & Triage",
      required_integrations: ["slack"],
      required_mcps: [],
      featured: true,
      docs_url: null,
      triggers: [{ event_type: "slack:message", conditions: null, replies: [] }],
      actions: [
        {
          type: "monitor_session",
          setup_prompt: "triage the bug",
          slack_monitor_config: { source_channel_id: "", team_id: null },
        },
      ],
    },
    {
      template_id: "customer-support-triage",
      name: "Triage Support Requests",
      description: "Watches your support channel.",
      category: "Monitoring & Triage",
      required_integrations: ["slack"],
      required_mcps: ["github"],
      featured: false,
      docs_url: "https://example.com/docs",
      triggers: [{ event_type: "slack:message", conditions: null, replies: [] }],
      actions: [{ type: "start_session", prompt: "triage" }],
    },
  ],
};

// ---- schedules (deprecated) ----

export const SCHEDULE = {
  scheduled_session_id: "sched-1",
  org_id: "org-x",
  name: "Weekly report",
  prompt: "generate the weekly report",
  playbook: null,
  frequency: "0 9 * * 1",
  interval_count: 1,
  schedule_type: "recurring",
  scheduled_at: null,
  enabled: true,
  notify_on: "failure",
  agent: "devin",
  bypass_approval: false,
  consecutive_failures: 0,
  created_by: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  last_edited_by: null,
  last_executed_at: "2026-01-06T09:00:00Z",
  last_error_at: null,
  last_error_message: null,
  platform: null,
  skill_ref: null,
  slack_channel_id: null,
  slack_team_id: null,
  tags: ["weekly"],
  target_devin_id: null,
};

export const SCHEDULES = [
  SCHEDULE,
  {
    ...SCHEDULE,
    scheduled_session_id: "sched-2",
    name: "Daily sync",
    frequency: "0 8 * * *",
    enabled: false,
    notify_on: "always",
    tags: null,
  },
  {
    ...SCHEDULE,
    scheduled_session_id: "sched-3",
    name: "One-off migration",
    schedule_type: "one_time",
    scheduled_at: "2026-02-01T00:00:00Z",
    frequency: null,
    agent: "data_analyst",
  },
];

export const PROBLEM = (status: number, detail: string) => ({
  type: "about:blank",
  title: "Error",
  status,
  detail,
});

// ---- sessions fixtures ----
const SESSION_BASE = {
  acus_consumed: 1.25,
  automation_id: null,
  category: "bug_fixing",
  child_session_ids: null,
  devin_mode: "normal",
  is_archived: false,
  on_demand_usage: null,
  org_id: "org-x",
  origin: "api",
  parent_session_id: null,
  playbook_id: null,
  pull_requests: [{ pr_state: "open", pr_url: "https://github.com/o/r/pull/1" }],
  security_profile: null,
  service_user_id: null,
  status_detail: "working",
  structured_output: null,
  subcategory: null,
  user_id: "user-1",
};

export const SESSION_1 = {
  ...SESSION_BASE,
  session_id: "sess-1",
  status: "running",
  title: "Fix login bug",
  tags: ["bug", "backend"],
  created_at: 1767567600, // 2026-01-05T01:00:00Z
  updated_at: 1767571200,
  url: "https://app.devin.ai/sessions/sess-1",
};

export const SESSION_2 = {
  ...SESSION_BASE,
  session_id: "sess-2",
  status: "exit",
  status_detail: "finished",
  title: "Add tests",
  tags: [],
  created_at: 1767481200,
  updated_at: 1767484800,
  url: "https://app.devin.ai/sessions/sess-2",
};

export const SESSION_3 = {
  ...SESSION_BASE,
  session_id: "sess-3",
  status: "suspended",
  status_detail: "inactivity",
  title: "Refactor parser",
  tags: ["refactor"],
  created_at: 1767394800,
  updated_at: 1767398400,
  url: "https://app.devin.ai/sessions/sess-3",
};

export const SESSIONS = [SESSION_1, SESSION_2, SESSION_3];
const SESSION_BY_ID = new Map(SESSIONS.map((s) => [s.session_id, s]));

const INSIGHT_EXTRAS = {
  num_devin_messages: 12,
  num_user_messages: 5,
  session_size: "m",
  analysis_status: "completed",
  analysis: { classification: { category: "bug_fixing", confidence: 0.9 } },
};
export const SESSION_INSIGHTS = { ...SESSION_1, ...INSIGHT_EXTRAS };
export const SESSION_INSIGHTS_2 = { ...SESSION_2, ...INSIGHT_EXTRAS };
export const SESSION_INSIGHTS_3 = { ...SESSION_3, ...INSIGHT_EXTRAS };
export const SESSION_INSIGHTS_LIST = [SESSION_INSIGHTS, SESSION_INSIGHTS_2, SESSION_INSIGHTS_3];

export const SESSION_MESSAGE = (n: number) => ({
  created_at: 1767567600 + n * 60,
  event_id: `evt-${n}`,
  message: n % 2 === 0 ? `user message ${n}` : `devin reply ${n}\nwith details`,
  origin: "api",
  source: n % 2 === 0 ? "user" : "devin",
  user_id: n % 2 === 0 ? "user-1" : null,
  username: n % 2 === 0 ? "Test User" : null,
});
export const SESSION_MESSAGES = [1, 2, 3, 4, 5].map(SESSION_MESSAGE);

export const SESSION_ATTACHMENTS = [
  {
    attachment_id: "att-1",
    content_type: "image/png",
    name: "screenshot.png",
    source: "user",
    url: "https://files.example.com/att-1",
  },
  {
    attachment_id: "att-2",
    content_type: "text/plain",
    name: "log.txt",
    source: "devin",
    url: "https://files.example.com/att-2",
  },
];

export const SESSION_TAGS = ["bug", "backend"];

// cursor ページネーションの fake 実装。cursor は offset の 10 進文字列、
// first は見ずに pageSize 件ずつ返す (CLI のカーソル追従を試すため)
function paginate<T>(items: T[], q: URLSearchParams, pageSize = 2) {
  const after = q.get("after");
  const offset = after ? Number(after) : 0;
  const slice = items.slice(offset, offset + pageSize);
  const next = offset + pageSize;
  return {
    items: slice,
    end_cursor: next < items.length ? String(next) : null,
    has_next_page: next < items.length,
    total: items.length,
  };
}

const findSession = (id: string) => SESSION_BY_ID.get(id) ?? null;

const PROXY_PAGE = `<!DOCTYPE html>
<html><head><title>502 Bad Gateway</title></head>
<body><center><h1>502 Bad Gateway</h1></center><hr><center>nginx</center></body></html>
`;

export type Logged = {
  method: string;
  path: string;
  query: URLSearchParams;
  auth: string | null;
  body?: unknown;
};

export type FakeOptions = {
  selfBody?: unknown;
  // pathname prefix → status。ProblemDetail を返す
  statuses?: Record<string, { status: number; detail: string }>;
  proxyStatus?: number;
  hang?: string[];
};

export type Fake = { url: string; log: Logged[]; stop: () => void };

const notFound = () => Response.json(PROBLEM(404, "not found"), { status: 404 });

const intParam = (v: string | null, dflt: number) => {
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : dflt;
};

// notes / automations 用のカーソルページング。after は先頭からの index。
// 1 ページの上限を 2 件にして、複数ページを必ず踏むようにする
function cursorPage<T>(u: URL, items: T[]): unknown {
  const first = Math.min(Math.max(1, intParam(u.searchParams.get("first"), 200)), 2);
  const after = Math.max(0, intParam(u.searchParams.get("after"), 0));
  const slice = items.slice(after, after + first);
  const end = after + slice.length;
  const hasNext = end < items.length;
  return {
    items: slice,
    end_cursor: hasNext ? String(end) : null,
    has_next_page: hasNext,
    total: items.length,
  };
}

// schedules 用。生成クライアントは limit / offset を使う
function offsetPage<T>(u: URL, items: T[]): unknown {
  const limit = Math.min(Math.max(1, intParam(u.searchParams.get("limit"), 200)), 2);
  const offset = Math.max(0, intParam(u.searchParams.get("offset"), 0));
  const slice = items.slice(offset, offset + limit);
  const hasNext = offset + slice.length < items.length;
  return {
    items: slice,
    end_cursor: hasNext ? String(offset + slice.length) : null,
    has_next_page: hasNext,
    total: items.length,
  };
}

async function readBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function startFake(options: FakeOptions = {}): Fake {
  const log: Logged[] = [];
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const u = new URL(req.url);
      const auth = req.headers.get("authorization");
      // POST/PUT の body を検査できるよう記録する。JSON でなければ生テキスト、空なら null
      const body = await readBody(req);
      log.push({ method: req.method, path: u.pathname, query: u.searchParams, auth, body });

      if (options.proxyStatus)
        return new Response(PROXY_PAGE, {
          status: options.proxyStatus,
          headers: { "Content-Type": "text/html" },
        });
      if (options.hang?.includes(u.pathname)) await new Promise(() => {});

      // attachment download の 2 段目 (presigned)。本物同様 credential 無しで返す
      if (u.pathname.startsWith("/presigned/") && req.method === "GET")
        return new Response(PRESIGNED_BYTES, {
          headers: { "Content-Type": "application/octet-stream" },
        });

      if (auth !== `Bearer ${API_KEY}`)
        return Response.json(PROBLEM(401, "invalid or missing token"), { status: 401 });

      for (const [prefix, s] of Object.entries(options.statuses ?? {})) {
        if (u.pathname.startsWith(prefix))
          return Response.json(PROBLEM(s.status, s.detail), { status: s.status });
      }

      if (u.pathname === "/v3/self" && req.method === "GET")
        return Response.json(options.selfBody ?? SELF_PAT);

      // knowledge notes
      if (
        /^\/v3\/organizations\/[^/]+\/knowledge\/folders$/.test(u.pathname) &&
        req.method === "GET"
      )
        return Response.json(KNOWLEDGE_FOLDERS);
      if (u.pathname.endsWith("/knowledge/notes")) {
        if (req.method === "GET") return Response.json(cursorPage(u, KNOWLEDGE_NOTES));
        if (req.method === "POST")
          return Response.json(
            {
              ...KNOWLEDGE_NOTE,
              ...(body as Record<string, unknown>),
              note_id: "note-new",
              created_at: 1767225600,
              updated_at: 1767225600,
            },
            { status: 201 },
          );
      }
      const noteMatch = /\/knowledge\/notes\/([^/]+)$/.exec(u.pathname);
      if (noteMatch) {
        if (req.method === "GET") return Response.json(KNOWLEDGE_NOTE);
        if (req.method === "PUT")
          return Response.json({ ...KNOWLEDGE_NOTE, ...(body as Record<string, unknown>) });
        if (req.method === "DELETE") return Response.json(KNOWLEDGE_NOTE);
      }

      // automations。schemas / templates は /{id} より先に判定する
      if (
        /^\/v3\/organizations\/[^/]+\/automations\/schemas$/.test(u.pathname) &&
        req.method === "GET"
      )
        return Response.json(AUTOMATION_SCHEMAS);
      if (
        /^\/v3\/organizations\/[^/]+\/automations\/templates$/.test(u.pathname) &&
        req.method === "GET"
      )
        return Response.json(AUTOMATION_TEMPLATES);
      if (u.pathname.endsWith("/automations")) {
        if (req.method === "GET") return Response.json(cursorPage(u, AUTOMATIONS));
        if (req.method === "POST")
          return Response.json(
            {
              ...AUTOMATION,
              ...(body as Record<string, unknown>),
              automation_id: "auto-new",
            },
            { status: 201 },
          );
      }
      const autoMatch = /\/automations\/([^/]+)$/.exec(u.pathname);
      if (autoMatch) {
        if (req.method === "GET") return Response.json(AUTOMATION);
        if (req.method === "PATCH")
          return Response.json({ ...AUTOMATION, ...(body as Record<string, unknown>) });
        if (req.method === "DELETE") return Response.json(AUTOMATION);
      }

      // schedules
      if (u.pathname.endsWith("/schedules")) {
        if (req.method === "GET") return Response.json(offsetPage(u, SCHEDULES));
        if (req.method === "POST")
          return Response.json(
            { ...SCHEDULE, ...(body as Record<string, unknown>) },
            { status: 201 },
          );
      }
      const schedMatch = /\/schedules\/([^/]+)$/.exec(u.pathname);
      if (schedMatch) {
        if (req.method === "GET") return Response.json(SCHEDULE);
        if (req.method === "PATCH")
          return Response.json({ ...SCHEDULE, ...(body as Record<string, unknown>) });
        if (req.method === "DELETE") return Response.json(SCHEDULE);
      }

      if (
        /^\/v3\/organizations\/[^/]+\/consumption\/daily$/.test(u.pathname) &&
        req.method === "GET"
      )
        return Response.json(CONSUMPTION);
      if (
        /^\/v3\/organizations\/[^/]+\/consumption\/daily\/users\/[^/]+$/.test(u.pathname) &&
        req.method === "GET"
      )
        return Response.json(CONSUMPTION);
      if (
        /^\/v3\/organizations\/[^/]+\/consumption\/daily\/service-users\/[^/]+$/.test(u.pathname) &&
        req.method === "GET"
      )
        return Response.json(CONSUMPTION);
      if (
        /^\/v3\/organizations\/[^/]+\/consumption\/daily\/sessions\/[^/]+$/.test(u.pathname) &&
        req.method === "GET"
      )
        return Response.json(CONSUMPTION);

      const metricMatch = /^\/v3\/organizations\/[^/]+\/metrics\/([a-z-]+)$/.exec(u.pathname);
      if (metricMatch && req.method === "GET") {
        switch (metricMatch[1]) {
          case "usage":
            return Response.json(METRICS_USAGE);
          case "sessions":
            return Response.json(METRICS_SESSIONS);
          case "prs":
            return Response.json(METRICS_PRS);
          case "searches":
            return Response.json(METRICS_SEARCHES);
          case "dau":
          case "wau":
          case "mau":
            return Response.json(METRICS_ACTIVE_USERS);
          case "active-users":
            return Response.json(METRICS_ACTIVE_USERS[0]);
        }
      }

      // --- members (v3beta1) ---
      const memberUserMatch = /^\/v3beta1\/organizations\/[^/]+\/members\/users\/([^/]+)$/.exec(
        u.pathname,
      );
      if (memberUserMatch && req.method === "GET") {
        if (memberUserMatch[1] === "missing") return notFound();
        return Response.json(MEMBER_DETAIL);
      }
      if (/^\/v3beta1\/organizations\/[^/]+\/members\/users$/.test(u.pathname)) {
        if (req.method !== "GET") return notFound();
        // cursor pagination: after 無しが 1 ページ目、after=cur-2 が 2 ページ目
        if (u.searchParams.get("after") === "cur-2")
          return Response.json({
            items: [MEMBER_USER_2],
            end_cursor: null,
            has_next_page: false,
            total: 2,
          });
        return Response.json({
          items: [MEMBER_USER_1],
          end_cursor: "cur-2",
          has_next_page: true,
          total: 2,
        });
      }
      if (/^\/v3beta1\/organizations\/[^/]+\/members\/idp-users$/.test(u.pathname)) {
        if (req.method !== "GET") return notFound();
        return Response.json({ items: [IDP_USER], has_next_page: false, total: 1 });
      }

      // --- playbooks ---
      const playbookMatch = /^\/v3\/organizations\/[^/]+\/playbooks\/([^/]+)$/.exec(u.pathname);
      if (playbookMatch) {
        const id = playbookMatch[1];
        if (id === "missing") return notFound();
        if (req.method === "GET") return Response.json(PLAYBOOK);
        if (req.method === "PUT")
          return Response.json({ ...PLAYBOOK, ...(body as Record<string, unknown>) });
        if (req.method === "DELETE") return Response.json(PLAYBOOK);
        return notFound();
      }
      if (/^\/v3\/organizations\/[^/]+\/playbooks$/.test(u.pathname)) {
        if (req.method === "GET")
          return Response.json({ items: [PLAYBOOK, PLAYBOOK_2], has_next_page: false, total: 2 });
        if (req.method === "POST") {
          const reqBody = (body ?? {}) as Record<string, unknown>;
          return Response.json({
            ...PLAYBOOK,
            ...reqBody,
            playbook_id: "pb-new",
            created_at: 1767400000,
            updated_at: 1767400000,
          });
        }
        return notFound();
      }

      // --- pr-reviews (GET は pr_url 必須。一覧 API ではない) ---
      if (/^\/v3\/organizations\/[^/]+\/pr-reviews$/.test(u.pathname)) {
        if (req.method === "GET") {
          const prUrl = u.searchParams.get("pr_url");
          if (!prUrl)
            return Response.json(PROBLEM(422, "query.pr_url: Field required"), { status: 422 });
          if (prUrl.includes("missing")) return notFound();
          return Response.json(PR_REVIEW);
        }
        if (req.method === "POST") {
          // body は readBody で parse 済み。JSON object として届くことだけ確認する
          if (typeof body !== "object" || body === null)
            return Response.json(PROBLEM(400, "body must be a JSON object"), { status: 400 });
          return Response.json({ ...PR_REVIEW, status: "pending" });
        }
        return notFound();
      }

      // --- attachments ---
      if (/^\/v3\/organizations\/[^/]+\/attachments$/.test(u.pathname)) {
        if (req.method !== "POST") return notFound();
        // multipart body は JSON でないので readBody は生テキストを返す。
        // そこから filename="..." を拾って name に載せる
        const m = typeof body === "string" ? /filename="([^"]+)"/.exec(body) : null;
        return Response.json({ ...ATTACHMENT, name: m?.[1] ?? ATTACHMENT.name });
      }
      const attachmentMatch = /^\/v3\/organizations\/[^/]+\/attachments\/([^/]+)\/([^/]+)$/.exec(
        u.pathname,
      );
      if (attachmentMatch && req.method === "GET") {
        if (attachmentMatch[1] === "missing") return notFound();
        // 実 API 同様 307 で presigned URL にリダイレクトする
        return new Response(null, {
          status: 307,
          headers: {
            location: `${u.origin}/presigned/${attachmentMatch[1]}/${attachmentMatch[2]}`,
          },
        });
      }

      // --- security-profiles (v3beta1) ---
      const profileMatch = /^\/v3beta1\/organizations\/[^/]+\/security-profiles\/([^/]+)$/.exec(
        u.pathname,
      );
      if (profileMatch) {
        const id = profileMatch[1];
        if (id === "missing") return notFound();
        if (req.method === "GET") return Response.json(SECURITY_PROFILE);
        if (req.method === "PATCH")
          return Response.json({ ...SECURITY_PROFILE, ...(body as Record<string, unknown>) });
        if (req.method === "DELETE") return new Response(null, { status: 204 });
        return notFound();
      }
      if (/^\/v3beta1\/organizations\/[^/]+\/security-profiles$/.test(u.pathname)) {
        if (req.method === "GET")
          return Response.json({
            items: [SECURITY_PROFILE],
            has_next_page: false,
            total: 1,
          });
        if (req.method === "POST") {
          const reqBody = (body ?? {}) as Record<string, unknown>;
          return Response.json({
            ...SECURITY_PROFILE,
            ...reqBody,
            profile_id: "sp-new",
          });
        }
        return notFound();
      }
      if (/^\/v3beta1\/organizations\/[^/]+\/security-profile-settings$/.test(u.pathname)) {
        if (req.method === "GET") return Response.json(SECURITY_PROFILE_SETTINGS);
        if (req.method === "PATCH") {
          const reqBody = (body ?? {}) as Record<string, unknown>;
          return Response.json({
            ...SECURITY_PROFILE_SETTINGS,
            ...(reqBody.default !== undefined ? { default: reqBody.default } : {}),
            ...(reqBody.automations_default !== undefined
              ? { automations_default: reqBody.automations_default }
              : {}),
          });
        }
        return notFound();
      }
      if (/^\/v3beta1\/organizations\/[^/]+\/default-platform$/.test(u.pathname)) {
        if (req.method === "GET") return Response.json(DEFAULT_PLATFORM);
        if (req.method === "PUT") {
          const reqBody = (body ?? {}) as Record<string, unknown>;
          return Response.json({
            platform: (reqBody.platform as string | null | undefined) ?? null,
            outpost_pool_id: (reqBody.outpost_pool_id as string | null | undefined) ?? null,
            outpost_pool_name: null,
          });
        }
        return notFound();
      }

      // ---- sessions (org scope) ----
      // /sessions/insights と /sessions は {devin_id} より先に判定する
      // ("insights" が devin_id に見えるため)
      if (/^\/v3\/organizations\/[^/]+\/sessions\/insights$/.test(u.pathname)) {
        if (req.method === "GET")
          return Response.json(paginate(SESSION_INSIGHTS_LIST, u.searchParams));
      }
      if (/^\/v3\/organizations\/[^/]+\/sessions$/.test(u.pathname)) {
        if (req.method === "GET") return Response.json(paginate(SESSIONS, u.searchParams));
        if (req.method === "POST") {
          const b = (body ?? {}) as Record<string, unknown>;
          return Response.json({
            ...SESSION_1,
            session_id: "sess-new",
            title: typeof b.title === "string" ? b.title : "New session",
            tags: Array.isArray(b.tags) ? b.tags : [],
            url: "https://app.devin.ai/sessions/sess-new",
          });
        }
      }

      const sessSub = /^\/v3\/organizations\/[^/]+\/sessions\/([^/]+)(\/[a-z]+)?$/.exec(u.pathname);
      if (sessSub) {
        const [, id, sub] = sessSub;
        const s = findSession(id ?? "");
        if (!s) return Response.json(PROBLEM(404, "session not found"), { status: 404 });
        if (sub === "/messages" && req.method === "GET")
          return Response.json(paginate(SESSION_MESSAGES, u.searchParams));
        if (sub === "/insights" && req.method === "GET")
          return Response.json(
            SESSION_INSIGHTS_LIST.find((i) => i.session_id === s.session_id) ?? SESSION_INSIGHTS,
          );
        if (sub === "/attachments" && req.method === "GET")
          return Response.json(SESSION_ATTACHMENTS);
        if (sub === "/archive" && req.method === "POST")
          return Response.json({ ...s, is_archived: true });
        if (sub === "/tags") {
          if (req.method === "GET") return Response.json({ tags: SESSION_TAGS });
          const tags = Array.isArray((body as { tags?: unknown })?.tags)
            ? ((body as { tags: unknown[] }).tags as string[])
            : [];
          if (req.method === "POST") {
            const merged = [...new Set([...SESSION_TAGS, ...tags])];
            return Response.json({ tags: merged });
          }
          if (req.method === "PUT") return Response.json({ tags });
        }
        if (sub === undefined) {
          if (req.method === "GET") return Response.json(s);
          if (req.method === "DELETE")
            return Response.json({ ...s, status: "exit", status_detail: "finished" });
        }
      }

      return Response.json(PROBLEM(404, "no route"), { status: 404 });
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, log, stop: () => void server.stop(true) };
}
