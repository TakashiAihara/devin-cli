import { describe, expect, test } from "bun:test";
import { API_KEY, AUTOMATION_SCHEMAS, startFake } from "./helpers/fake-devin.ts";
import { makeSandbox, removeSandbox, runCli, tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

const iso = (unixSec: number) => new Date(unixSec * 1000).toISOString();
// fixture の updated_at / created_at / next_run_at / last_invocation.fired_at
const T_CREATED = iso(1767225600);
const T_UPDATED = iso(1767312000);
const T_NEXT = iso(1767400000);
const T_FIRED = iso(1767312000);

const AUTO_LIST_HEADER =
  "automation_id\tname\tenabled\trun_as\ttemplate_id\tnext_run_at\tupdated_at\ttriggers\tactions";
const AUTO_DETAIL_HEADER =
  "automation_id\tname\tenabled\trun_as\ttemplate_id\tcreated_at\tupdated_at\tnext_run_at\tcreated_by\tlast_invocation\ttriggers\tactions\tmetadata";

describe("automations list", () => {
  test("カーソルで全ページ取り TSV で出す", async () => {
    const r = await ctx.run(["automations", "list", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        AUTO_LIST_HEADER,
        `auto-1\tNightly triage\ttrue\torganization\t-\t${T_NEXT}\t${T_UPDATED}\tschedule:recurring\tstart_session`,
        `auto-2\tPR review\tfalse\tservice_user:svc-1\ttpl-1\t-\t${T_UPDATED}\tgithub:pull_request\tstart_session`,
        `auto-3\tSlack watcher\ttrue\tcreator\t-\t${T_NEXT}\t${T_UPDATED}\tslack:message\tmonitor_session`,
      ),
    );
    const calls = ctx.fake.log.filter((l) => l.path === "/v3/organizations/org-x/automations");
    expect(calls).toHaveLength(2);
    expect(calls[1]?.query.get("after")).toBe("2");
  });

  test("--limit で打ち切る", async () => {
    const r = await ctx.run(["automations", "list", "--org", "org-x", "--limit", "2"]);
    expect(r.code).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines).toHaveLength(3); // header + 2 件
    expect(ctx.fake.log.filter((l) => l.path.endsWith("/automations"))).toHaveLength(1);
  });

  test("フィルタはクエリに乗る (agent_types は繰り返し)", async () => {
    const r = await ctx.run([
      "automations",
      "list",
      "--org",
      "org-x",
      "--search",
      "triage",
      "--creator",
      "user-1",
      "--event-type",
      "github:push",
      "--agent-type",
      "new_session",
      "--agent-type",
      "generic_assistant",
      "--enabled",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/automations");
    expect(call?.query.get("search")).toBe("triage");
    expect(call?.query.get("creator_id")).toBe("user-1");
    expect(call?.query.get("event_type")).toBe("github:push");
    expect(call?.query.getAll("agent_types")).toEqual(["new_session", "generic_assistant"]);
    expect(call?.query.get("enabled")).toBe("true");
  });

  test("--disabled は enabled=false を送る", async () => {
    const r = await ctx.run(["automations", "list", "--org", "org-x", "--disabled"]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/automations");
    expect(call?.query.get("enabled")).toBe("false");
  });

  test("--enabled と --disabled の同時指定は exit 2", async () => {
    const r = await ctx.run(["automations", "list", "--org", "org-x", "--enabled", "--disabled"]);
    expect(r.code).toBe(2);
  });

  test("列挙外の --agent-type は exit 2", async () => {
    const r = await ctx.run(["automations", "list", "--org", "org-x", "--agent-type", "bogus"]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("--agent-type");
    expect(ctx.fake.log).toHaveLength(0);
  });

  test("--json は {items: [...]} を出す", async () => {
    const r = await ctx.run(["automations", "list", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).items).toHaveLength(3);
  });
});

describe("automations get", () => {
  test("詳細 TSV", async () => {
    const r = await ctx.run(["automations", "get", "auto-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        AUTO_DETAIL_HEADER,
        `auto-1\tNightly triage\ttrue\torganization\t-\t${T_CREATED}\t${T_UPDATED}\t${T_NEXT}\tuser:user-1\tsucceeded@${T_FIRED}\tschedule:recurring\tstart_session\tteam=infra`,
      ),
    );
    expect(ctx.fake.log[0]?.path).toBe("/v3/organizations/org-x/automations/auto-1");
  });
});

describe("automations create", () => {
  test("フラグ指定で start_session action を組み立てて POST", async () => {
    const r = await ctx.run([
      "automations",
      "create",
      "--org",
      "org-x",
      "--name",
      "Triage",
      "--run-as",
      "service-user:svc-9",
      "--trigger",
      "github:push",
      "--trigger",
      "slack:message",
      "--prompt",
      "do it",
      "--metadata",
      "team=infra",
      "--metadata",
      "env=prod",
      "--disabled",
    ]);
    expect(r.code).toBe(0);
    const post = ctx.fake.log.find(
      (l) => l.method === "POST" && l.path === "/v3/organizations/org-x/automations",
    );
    expect(post?.body).toEqual({
      name: "Triage",
      run_as: { type: "service_user", service_user_id: "svc-9" },
      triggers: [{ event_type: "github:push" }, { event_type: "slack:message" }],
      actions: [{ type: "start_session", prompt: "do it" }],
      enabled: false,
      metadata: { team: "infra", env: "prod" },
    });
    expect(r.out).toContain("auto-new\tTriage");
    expect(r.out).toContain("service_user:svc-9");
  });

  test("--run-as organization / creator", async () => {
    for (const [flag, expected] of [
      ["organization", { type: "organization" }],
      ["creator", { type: "creator" }],
    ] as const) {
      const r = await ctx.run([
        "automations",
        "create",
        "--org",
        "org-x",
        "--name",
        "T",
        "--run-as",
        flag,
        "--trigger",
        "schedule:recurring",
        "--prompt",
        "p",
      ]);
      expect(r.code).toBe(0);
      const post = ctx.fake.log.filter((l) => l.method === "POST").at(-1);
      expect(post?.body).toMatchObject({ run_as: expected });
    }
  });

  test("--run-as の不正値は exit 2", async () => {
    const r = await ctx.run([
      "automations",
      "create",
      "--org",
      "org-x",
      "--name",
      "T",
      "--run-as",
      "bogus",
      "--trigger",
      "schedule:recurring",
      "--prompt",
      "p",
    ]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("--run-as");
  });

  test("必須オプション欠落は exit 2", async () => {
    const r = await ctx.run(["automations", "create", "--org", "org-x", "--name", "T"]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("必須オプション");
    expect(ctx.fake.log).toHaveLength(0);
  });

  test("--body-json は全体を JSON で渡し、フラグで name/enabled を上書き", async () => {
    const r = await ctx.run([
      "automations",
      "create",
      "--org",
      "org-x",
      "--body-json",
      JSON.stringify({
        name: "Json name",
        run_as: { type: "creator" },
        triggers: [{ event_type: "schedule:recurring" }],
        actions: [{ type: "start_session", prompt: "p" }],
        session_settings: { devin_mode: "fast" },
      }),
      "--name",
      "Overridden",
      "--enabled",
    ]);
    expect(r.code).toBe(0);
    const post = ctx.fake.log.find((l) => l.method === "POST");
    expect(post?.body).toEqual({
      name: "Overridden",
      run_as: { type: "creator" },
      triggers: [{ event_type: "schedule:recurring" }],
      actions: [{ type: "start_session", prompt: "p" }],
      session_settings: { devin_mode: "fast" },
      enabled: true,
    });
  });

  test("--body-json と構造フラグの併用は exit 2", async () => {
    const r = await ctx.run([
      "automations",
      "create",
      "--org",
      "org-x",
      "--body-json",
      "{}",
      "--trigger",
      "github:push",
    ]);
    expect(r.code).toBe(2);
  });

  test("壊れた JSON は exit 2", async () => {
    const r = await ctx.run(["automations", "create", "--org", "org-x", "--body-json", "{oops"]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("JSON");
  });
});

describe("automations update", () => {
  test("PATCH で差分を送る", async () => {
    const r = await ctx.run([
      "automations",
      "update",
      "auto-1",
      "--org",
      "org-x",
      "--name",
      "New name",
      "--disabled",
    ]);
    expect(r.code).toBe(0);
    const patch = ctx.fake.log.find(
      (l) => l.method === "PATCH" && l.path === "/v3/organizations/org-x/automations/auto-1",
    );
    expect(patch?.body).toEqual({ name: "New name", enabled: false });
    expect(r.out).toContain("New name");
  });

  test("--body-json で任意フィールドの差分", async () => {
    const r = await ctx.run([
      "automations",
      "update",
      "auto-1",
      "--org",
      "org-x",
      "--body-json",
      JSON.stringify({ limits: { max_acu_limit: 10 } }),
    ]);
    expect(r.code).toBe(0);
    const patch = ctx.fake.log.find((l) => l.method === "PATCH");
    expect(patch?.body).toEqual({ limits: { max_acu_limit: 10 } });
  });

  test("指定なしは exit 2", async () => {
    const r = await ctx.run(["automations", "update", "auto-1", "--org", "org-x"]);
    expect(r.code).toBe(2);
  });
});

describe("automations delete", () => {
  test("DELETE を送り、消えた automation を出す", async () => {
    const r = await ctx.run(["automations", "delete", "auto-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    const del = ctx.fake.log.find((l) => l.method === "DELETE");
    expect(del?.path).toBe("/v3/organizations/org-x/automations/auto-1");
    expect(r.out).toContain("auto-1\tNightly triage");
  });
});

describe("automations schemas / templates", () => {
  test("schemas はサマリ + イベント一覧の TSV", async () => {
    const r = await ctx.run(["automations", "schemas", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "field\tvalue",
        "update_semantics\tmerge_patch",
        "skills_serve_playbooks\ttrue",
        "script_check_available\ttrue",
        "default_fallback_devin_mode\tnormal",
        "available_devin_modes\tnormal,fast",
        "security_profile\t-",
        "default_net_policy\tgit-manager.devin.ai",
        "source\tevent_type\tname\tcategory\tsupported_replies",
        "github\tgithub:pull_request\tPull request\tgithub\tpost_response,attach_thread",
        "github\tgithub:push\tPush\tgithub\tpost_response",
        "schedule\tschedule:recurring\tRecurring schedule\tschedule\t",
      ),
    );
    expect(ctx.fake.log[0]?.path).toBe("/v3/organizations/org-x/automations/schemas");
  });

  test("schemas --security-profile-id はクエリに乗る", async () => {
    const r = await ctx.run([
      "automations",
      "schemas",
      "--org",
      "org-x",
      "--security-profile-id",
      "sp-1",
    ]);
    expect(r.code).toBe(0);
    expect(ctx.fake.log[0]?.query.get("security_profile_id")).toBe("sp-1");
  });

  test("schemas --json は生の構造を出す", async () => {
    const r = await ctx.run(["automations", "schemas", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(AUTOMATION_SCHEMAS);
  });

  test("templates は一覧 TSV", async () => {
    const r = await ctx.run(["automations", "templates", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "template_id\tname\tcategory\tfeatured\trequired_integrations\trequired_mcps\tdocs_url",
        "monitor-bugs-slack\tTriage Bug Reports\tMonitoring & Triage\ttrue\tslack\t\t-",
        "customer-support-triage\tTriage Support Requests\tMonitoring & Triage\tfalse\tslack\tgithub\thttps://example.com/docs",
      ),
    );
    expect(ctx.fake.log[0]?.path).toBe("/v3/organizations/org-x/automations/templates");
  });
});

describe("automations のエラー", () => {
  test("API が 403 を返したら exit 1 + detail", async () => {
    const fake = startFake({
      statuses: {
        "/v3/organizations/org-x/automations": {
          status: 403,
          detail: "missing ManageOrgAutomations",
        },
      },
    });
    const sb = makeSandbox();
    try {
      const r = await runCli(sb, ["automations", "list", "--org", "org-x"], {
        DEVIN_API_BASE_URL: fake.url,
        DEVIN_API_KEY: API_KEY,
      });
      expect(r.code).toBe(1);
      expect(r.err).toContain("missing ManageOrgAutomations");
    } finally {
      fake.stop();
      removeSandbox(sb);
    }
  });
});
