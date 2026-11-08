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

const PROXY_PAGE = `<!DOCTYPE html>
<html><head><title>502 Bad Gateway</title></head>
<body><center><h1>502 Bad Gateway</h1></center><hr><center>nginx</center></body></html>
`;

export type Logged = { method: string; path: string; query: URLSearchParams; auth: string | null };

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
      log.push({ method: req.method, path: u.pathname, query: u.searchParams, auth });

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

      return Response.json(PROBLEM(404, "no route"), { status: 404 });
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, log, stop: () => void server.stop(true) };
}
