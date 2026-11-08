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

// --- code-scans (org scope、read のみ) ---

export const CODE_SCAN_FINDING = {
  category: "sql-injection",
  code_owners: ["team-backend"],
  code_scan_run_id: "run-1",
  created_at: 1767225600,
  description: "user input reaches query builder",
  finding_id: "finding-1",
  note: null,
  orchestrator_session_id: "sess-1",
  payoff: "quick_win",
  pr_url: null,
  recommendation: "use parameterized queries",
  reference_snippets: [],
  repo_name: "acme/one",
  scan_id: "scan-1",
  session_id: null,
  severity: "high",
  status: "open",
  title: "SQL injection in search",
  updated_at: 1767312000,
};

export const CODE_SCAN_FINDINGS = {
  items: [CODE_SCAN_FINDING],
  end_cursor: null,
  has_next_page: false,
  total: 1,
};

export const CODE_SCAN_METRICS = {
  avg_pr_open_duration_seconds: 3600,
  avg_pr_time_to_merge_seconds: 7200,
  open_critical_findings_count: 1,
  open_high_findings_count: 2,
  open_low_findings_count: 0,
  open_medium_findings_count: 3,
  prs_closed_count: 1,
  prs_created_count: 4,
  prs_merged_count: 2,
  prs_open_count: 1,
  repos_scanned_count: 2,
  scans_count: 3,
};

export const CODE_SCAN = {
  created_at: 1767225600,
  effort: "normal",
  host: "github.com",
  org_id: "org-x",
  profile: { profile_id: "prof-1", name: "security-baseline" },
  repo_full_name: "acme/one",
  repo_name: "acme/one",
  scan_id: "scan-1",
  scan_type: "security",
  status: "completed",
  url: "https://app.devin.ai/code-scan/scan-1",
};

export const CODE_SCAN_SCANS = {
  items: [CODE_SCAN],
  end_cursor: null,
  has_next_page: false,
  total: 1,
};

export const CODE_SCAN_PROFILE_SUMMARY = {
  created_at: 1767225600,
  description: "default security profile",
  mode: "discover",
  name: "security-baseline",
  org_id: "org-x",
  profile_id: "prof-1",
  scan_type: "security",
  visibility: "org",
};

export const CODE_SCAN_PROFILES = {
  items: [CODE_SCAN_PROFILE_SUMMARY],
  end_cursor: null,
  has_next_page: false,
  total: 1,
};

export const CODE_SCAN_PROFILE_DETAIL = {
  ...CODE_SCAN_PROFILE_SUMMARY,
  batch_size: null,
  communication_guidance: null,
  exclude_globs: null,
  include_globs: ["src/**"],
  ingestion_source_guidance: null,
  investigation_guidance: "look for injection",
  post_ingestion_guidance: null,
  remediation_guidance: null,
  report_guidance: null,
  scan_paths: null,
  threat_model_guidance: null,
  triage_guidance: null,
  type_config: null,
  validation_guidance: null,
  validation_severities: ["critical", "high"],
};

// --- snapshot-setup (org scope) ---

export const SNAPSHOT_BLUEPRINT_ORG = {
  blueprint_id: "bp-org-1",
  build_on_default_branch_commit: null,
  created_at: 1767225600,
  repo_name: null,
  report_check_runs: null,
  source: null,
  type: "org",
  updated_at: 1767312000,
};

export const SNAPSHOT_BLUEPRINT_REPO = {
  blueprint_id: "bp-repo-1",
  build_on_default_branch_commit: true,
  created_at: 1767225600,
  repo_name: "acme/one",
  report_check_runs: false,
  source: "database",
  type: "repo",
  updated_at: 1767312000,
};

export const SNAPSHOT_BLUEPRINT_LIST = { data: [SNAPSHOT_BLUEPRINT_ORG, SNAPSHOT_BLUEPRINT_REPO] };

export const SNAPSHOT_PRESIGNED = {
  expires_at: 1767400000,
  url: "https://files.example.com/presigned/blueprint.yaml",
};

export const SNAPSHOT_BLUEPRINT_FILE = {
  blueprint_id: "bp-org-1",
  created_at: 1767225600,
  env_var_name: "NPM_TOKEN",
  file_id: "bf-1",
  name: "npm-token.txt",
  size_bytes: 42,
  updated_at: 1767312000,
};

export const SNAPSHOT_BLUEPRINT_FILE_LIST = { data: [SNAPSHOT_BLUEPRINT_FILE] };

export const SNAPSHOT_BUILD = {
  build_id: "build-1",
  completed_at: 1767312000,
  created_at: 1767225600,
  pinned: true,
  started_at: 1767225700,
  status: "succeeded",
  trigger: "manual",
  triggered_by_user_id: "user-1",
  updated_at: 1767312000,
};

// after=cur-2 で 2 ページ目を返す cursor pagination の fixture
export const SNAPSHOT_BUILDS_PAGE1 = {
  items: [SNAPSHOT_BUILD],
  end_cursor: "cur-2",
  has_next_page: true,
  total: 2,
};
export const SNAPSHOT_BUILDS_PAGE2 = {
  items: [{ ...SNAPSHOT_BUILD, build_id: "build-2", status: "running", pinned: false }],
  end_cursor: null,
  has_next_page: false,
  total: 2,
};

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

      // code-scans (org scope、read のみ)
      if (
        /^\/v3\/organizations\/[^/]+\/code-scans\/findings$/.test(u.pathname) &&
        req.method === "GET"
      )
        return Response.json(CODE_SCAN_FINDINGS);
      if (
        /^\/v3\/organizations\/[^/]+\/code-scans\/metrics$/.test(u.pathname) &&
        req.method === "GET"
      )
        return Response.json(CODE_SCAN_METRICS);
      if (
        /^\/v3\/organizations\/[^/]+\/code-scans\/scans$/.test(u.pathname) &&
        req.method === "GET"
      )
        return Response.json(CODE_SCAN_SCANS);
      if (
        /^\/v3\/organizations\/[^/]+\/code-scans\/profiles$/.test(u.pathname) &&
        req.method === "GET"
      )
        return Response.json(CODE_SCAN_PROFILES);
      const profileMatch = /^\/v3\/organizations\/[^/]+\/code-scans\/profiles\/([^/]+)$/.exec(
        u.pathname,
      );
      if (profileMatch && req.method === "GET") return Response.json(CODE_SCAN_PROFILE_DETAIL);

      // snapshot-setup (org scope)
      if (/^\/v3\/organizations\/[^/]+\/snapshot-setup\/blueprints$/.test(u.pathname)) {
        if (req.method === "GET") return Response.json(SNAPSHOT_BLUEPRINT_LIST);
        if (req.method === "POST") return Response.json(SNAPSHOT_BLUEPRINT_ORG, { status: 201 });
      }
      const blueprintSub =
        /^\/v3\/organizations\/[^/]+\/snapshot-setup\/blueprints\/([^/]+)\/(contents|files)(?:\/([^/]+))?$/.exec(
          u.pathname,
        );
      if (blueprintSub) {
        const [, , sub, fileId] = blueprintSub;
        if (sub === "contents" && req.method === "GET") return Response.json(SNAPSHOT_PRESIGNED);
        if (sub === "files" && !fileId) {
          if (req.method === "GET") return Response.json(SNAPSHOT_BLUEPRINT_FILE_LIST);
          if (req.method === "POST") return Response.json(SNAPSHOT_BLUEPRINT_FILE, { status: 201 });
        }
        if (sub === "files" && fileId && req.method === "DELETE")
          return new Response(null, { status: 204 });
      }
      const blueprintMatch =
        /^\/v3\/organizations\/[^/]+\/snapshot-setup\/blueprints\/([^/]+)$/.exec(u.pathname);
      if (blueprintMatch) {
        if (req.method === "GET") return Response.json(SNAPSHOT_BLUEPRINT_ORG);
        if (req.method === "PATCH") return Response.json(SNAPSHOT_BLUEPRINT_ORG);
        if (req.method === "DELETE") return new Response(null, { status: 204 });
      }
      if (/^\/v3\/organizations\/[^/]+\/snapshot-setup\/builds$/.test(u.pathname)) {
        if (req.method === "GET") {
          const after = u.searchParams.get("after");
          return Response.json(after === "cur-2" ? SNAPSHOT_BUILDS_PAGE2 : SNAPSHOT_BUILDS_PAGE1);
        }
        if (req.method === "POST") return Response.json(SNAPSHOT_BUILD, { status: 201 });
      }
      const buildSub =
        /^\/v3\/organizations\/[^/]+\/snapshot-setup\/builds\/([^/]+)\/(logs|cancel|pin)$/.exec(
          u.pathname,
        );
      if (buildSub) {
        const [, , sub] = buildSub;
        if (sub === "logs" && req.method === "GET") return Response.json(SNAPSHOT_PRESIGNED);
        if (sub === "cancel" && req.method === "POST") return Response.json(SNAPSHOT_BUILD);
        if (sub === "pin") {
          if (req.method === "POST") return Response.json(SNAPSHOT_BUILD);
          if (req.method === "DELETE") return new Response(null, { status: 204 });
        }
      }
      const buildMatch = /^\/v3\/organizations\/[^/]+\/snapshot-setup\/builds\/([^/]+)$/.exec(
        u.pathname,
      );
      if (buildMatch && req.method === "GET") return Response.json(SNAPSHOT_BUILD);

      return Response.json(PROBLEM(404, "no route"), { status: 404 });
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, log, stop: () => void server.stop(true) };
}
