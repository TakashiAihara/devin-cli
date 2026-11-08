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

export function startFake(options: FakeOptions = {}): Fake {
  const log: Logged[] = [];
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const u = new URL(req.url);
      const auth = req.headers.get("authorization");
      // POST/PUT の body を検査できるよう記録する (GET は undefined)
      const body =
        req.method === "GET" || req.method === "DELETE"
          ? undefined
          : await req.json().catch(() => undefined);
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
