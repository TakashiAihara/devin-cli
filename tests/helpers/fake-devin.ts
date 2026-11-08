// 偽の Devin API。/v3/self と org scope の consumption/metrics に canned JSON を返す。
// 認証: /v3/* は Authorization: Bearer cog_... を検査する
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

const PROXY_PAGE = `<!DOCTYPE html>
<html><head><title>502 Bad Gateway</title></head>
<body><center><h1>502 Bad Gateway</h1></center><hr><center>nginx</center></body></html>
`;

export type Logged = {
  method: string;
  path: string;
  query: URLSearchParams;
  auth: string | null;
  body: unknown;
};

export type FakeOptions = {
  selfBody?: unknown;
  // pathname prefix → status。ProblemDetail を返す
  statuses?: Record<string, { status: number; detail: string }>;
  proxyStatus?: number;
  hang?: string[];
};

export type Fake = { url: string; log: Logged[]; stop: () => void };

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
      const body = await readBody(req);
      log.push({ method: req.method, path: u.pathname, query: u.searchParams, auth, body });

      if (options.proxyStatus)
        return new Response(PROXY_PAGE, {
          status: options.proxyStatus,
          headers: { "Content-Type": "text/html" },
        });
      if (options.hang?.includes(u.pathname)) await new Promise(() => {});

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

      return Response.json(PROBLEM(404, "no route"), { status: 404 });
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, log, stop: () => void server.stop(true) };
}
