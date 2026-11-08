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

// --- repositories (org scope) ---

const REPO_INDEXING_STATUS_EMPTY = {
  indexing_enabled: false,
  latest_completed_search_index_job: null,
  latest_completed_wiki_index_job: null,
  latest_indexes: [],
};

export const REPO_ONE = {
  git_connection_host: "github.com",
  git_connection_id: "gc-1",
  indexing_status: { ...REPO_INDEXING_STATUS_EMPTY, indexing_enabled: true },
  last_updated_at: 1767225600,
  provider_repository_id: "prov-1",
  repo_description: "first repo",
  repo_full_name: "acme/one",
  repo_language: "TypeScript",
  repo_name: "one",
  repo_path: "acme/one",
};

export const REPO_TWO = {
  git_connection_host: "github.com",
  git_connection_id: "gc-1",
  indexing_status: null,
  last_updated_at: null,
  provider_repository_id: "prov-2",
  repo_description: null,
  repo_full_name: "acme/two",
  repo_language: null,
  repo_name: "two",
  repo_path: "acme/two",
};

// after=cur-2 で 2 ページ目を返す cursor pagination の fixture
export const REPOSITORIES_PAGE1 = {
  items: [REPO_ONE],
  end_cursor: "cur-2",
  has_next_page: true,
  total: 2,
};
export const REPOSITORIES_PAGE2 = {
  items: [REPO_TWO],
  end_cursor: null,
  has_next_page: false,
  total: 2,
};

export const INDEXING_LIST = {
  items: [
    {
      repository_path: "acme/one",
      indexing_enabled: true,
      indexing_status: null,
      branches: ["main", "dev"],
    },
    {
      repository_path: "acme/two",
      indexing_enabled: false,
      indexing_status: null,
      branches: [],
    },
  ],
  end_cursor: null,
  has_next_page: false,
  total: 2,
};

export const REPO_INDEXING_STATUS = {
  indexing_enabled: true,
  latest_completed_search_index_job: {
    branch_name: "main",
    commit: "abc123",
    created_at: 1767225600,
    job_id: "job-s1",
    status: "completed",
  },
  latest_completed_wiki_index_job: null,
  latest_indexes: [
    {
      branch_name: "main",
      commit: "abc123",
      created_at: 1767225600,
      job_id: "job-1",
      status: "completed",
    },
    {
      branch_name: "dev",
      commit: "def456",
      created_at: 1767312000,
      job_id: "job-2",
      status: "in_progress",
    },
  ],
};

export const indexingResponse = (repository_path: string) => ({
  repository_path,
  indexing_enabled: true,
  indexing_status: null,
  branches: ["main"],
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
  body: string;
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
      const body = await req.text();
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

      // repositories (org scope)。repository_path は encode 済みで届くので decode して fixture に合わせる
      if (/^\/v3\/organizations\/[^/]+\/repositories$/.test(u.pathname) && req.method === "GET") {
        const after = u.searchParams.get("after");
        return Response.json(after === "cur-2" ? REPOSITORIES_PAGE2 : REPOSITORIES_PAGE1);
      }
      if (/^\/v3\/organizations\/[^/]+\/repositories\/indexing$/.test(u.pathname)) {
        if (req.method === "GET") return Response.json(INDEXING_LIST);
        if (req.method === "PUT" || req.method === "DELETE")
          return Response.json(INDEXING_LIST.items);
      }
      const repoIndexing = /^\/v3\/organizations\/[^/]+\/repositories\/([^/]+)\/indexing$/.exec(
        u.pathname,
      );
      if (repoIndexing) {
        const repoPath = decodeURIComponent(repoIndexing[1] ?? "");
        if (req.method === "GET") return Response.json(REPO_INDEXING_STATUS);
        if (req.method === "PUT" || req.method === "DELETE")
          return Response.json(indexingResponse(repoPath));
      }
      const repoBranch =
        /^\/v3\/organizations\/[^/]+\/repositories\/([^/]+)\/indexing\/branches\/([^/]+)$/.exec(
          u.pathname,
        );
      if (repoBranch && req.method === "DELETE")
        return Response.json(indexingResponse(decodeURIComponent(repoBranch[1] ?? "")));

      return Response.json(PROBLEM(404, "no route"), { status: 404 });
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, log, stop: () => void server.stop(true) };
}
