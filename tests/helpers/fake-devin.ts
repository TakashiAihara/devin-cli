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

const notFound = () => Response.json(PROBLEM(404, "not found"), { status: 404 });

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
          return Response.json({ ...PLAYBOOK, ...(JSON.parse(body) as object) });
        if (req.method === "DELETE") return Response.json(PLAYBOOK);
        return notFound();
      }
      if (/^\/v3\/organizations\/[^/]+\/playbooks$/.test(u.pathname)) {
        if (req.method === "GET")
          return Response.json({ items: [PLAYBOOK, PLAYBOOK_2], has_next_page: false, total: 2 });
        if (req.method === "POST") {
          const reqBody = JSON.parse(body) as Record<string, unknown>;
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
          JSON.parse(body); // body が JSON として届くことだけ確認する
          return Response.json({ ...PR_REVIEW, status: "pending" });
        }
        return notFound();
      }

      // --- attachments ---
      if (/^\/v3\/organizations\/[^/]+\/attachments$/.test(u.pathname)) {
        if (req.method !== "POST") return notFound();
        // multipart body から filename="..." を拾って name に載せる
        const m = /filename="([^"]+)"/.exec(body);
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
          return Response.json({ ...SECURITY_PROFILE, ...(JSON.parse(body) as object) });
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
          const reqBody = JSON.parse(body) as Record<string, unknown>;
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
          const reqBody = JSON.parse(body) as Record<string, unknown>;
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
          const reqBody = JSON.parse(body) as Record<string, unknown>;
          return Response.json({
            platform: (reqBody.platform as string | null | undefined) ?? null,
            outpost_pool_id: (reqBody.outpost_pool_id as string | null | undefined) ?? null,
            outpost_pool_name: null,
          });
        }
        return notFound();
      }

      return Response.json(PROBLEM(404, "no route"), { status: 404 });
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, log, stop: () => void server.stop(true) };
}
