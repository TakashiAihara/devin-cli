import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  API_KEY,
  SNAPSHOT_BLUEPRINT_LIST,
  SNAPSHOT_BLUEPRINT_ORG,
  startFake,
} from "./helpers/fake-devin.ts";
import { makeSandbox, removeSandbox, runCli, tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();
const BLUEPRINTS = "/v3/organizations/org-x/snapshot-setup/blueprints";
const BUILDS = "/v3/organizations/org-x/snapshot-setup/builds";

const BLUEPRINT_TSV_HEAD =
  "blueprint_id\ttype\trepo_name\tsource\tcreated_at\tupdated_at\tbuild_on_default_branch_commit\treport_check_runs";
const BUILD_TSV_HEAD =
  "build_id\tstatus\ttrigger\tpinned\tcreated_at\tstarted_at\tcompleted_at\ttriggered_by_user_id";

describe("snapshot blueprints", () => {
  test("list は data envelope を TSV に展開する", async () => {
    const r = await ctx.run(["snapshot", "blueprints", "list", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        BLUEPRINT_TSV_HEAD,
        "bp-org-1\torg\t-\t-\t2026-01-01T00:00:00.000Z\t2026-01-02T00:00:00.000Z\t-\t-",
        "bp-repo-1\trepo\tacme/one\tdatabase\t2026-01-01T00:00:00.000Z\t2026-01-02T00:00:00.000Z\ttrue\tfalse",
      ),
    );
  });

  test("list --repo は repo_name クエリに渡る", async () => {
    const r = await ctx.run([
      "snapshot",
      "blueprints",
      "list",
      "--repo",
      "acme/one",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.path === BLUEPRINTS);
    expect(call?.query.get("repo_name")).toBe("acme/one");
  });

  test("list --json は data envelope ごと返す", async () => {
    const r = await ctx.run(["snapshot", "blueprints", "list", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(SNAPSHOT_BLUEPRINT_LIST);
  });

  test("get は blueprint_id を encode して詳細 TSV", async () => {
    const r = await ctx.run(["snapshot", "blueprints", "get", "bp-org-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        BLUEPRINT_TSV_HEAD,
        "bp-org-1\torg\t-\t-\t2026-01-01T00:00:00.000Z\t2026-01-02T00:00:00.000Z\t-\t-",
      ),
    );
  });

  test("create は POST に contents/repo_name/source を載せる", async () => {
    const r = await ctx.run([
      "snapshot",
      "blueprints",
      "create",
      "--repo",
      "acme/one",
      "--source",
      "database",
      "--contents",
      "initialize: bun install",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.method === "POST" && l.path === BLUEPRINTS);
    expect(JSON.parse(call?.body ?? "{}")).toEqual({
      contents: "initialize: bun install",
      repo_name: "acme/one",
      source: "database",
    });
  });

  test("create --contents-file はファイルを読んで contents にする", async () => {
    writeFileSync(join(ctx.sb.dir, "bp.yaml"), "initialize: echo hi\n");
    const r = await ctx.run([
      "snapshot",
      "blueprints",
      "create",
      "--contents-file",
      "bp.yaml",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.method === "POST" && l.path === BLUEPRINTS);
    expect(JSON.parse(call?.body ?? "{}")).toEqual({
      contents: "initialize: echo hi\n",
    });
  });

  test("create --source git で contents を渡すと exit 2 (API を叩かない)", async () => {
    const r = await ctx.run([
      "snapshot",
      "blueprints",
      "create",
      "--source",
      "git",
      "--contents",
      "x",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(2);
    expect(ctx.fake.log.filter((l) => l.method === "POST")).toHaveLength(0);
  });

  test("update は PATCH に指定項目だけ載せる", async () => {
    const r = await ctx.run([
      "snapshot",
      "blueprints",
      "update",
      "bp-org-1",
      "--contents",
      "new yaml",
      "--position",
      "2",
      "--build-on-default-branch",
      "true",
      "--report-check-runs",
      "false",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) => l.method === "PATCH" && l.path === `${BLUEPRINTS}/bp-org-1`,
    );
    expect(JSON.parse(call?.body ?? "{}")).toEqual({
      contents: "new yaml",
      position: 2,
      build_on_default_branch_commit: true,
      report_check_runs: false,
    });
  });

  test("update は引数無しだと exit 2 (空 body は API が 400)", async () => {
    const r = await ctx.run(["snapshot", "blueprints", "update", "bp-org-1", "--org", "org-x"]);
    expect(r.code).toBe(2);
    expect(ctx.fake.log.filter((l) => l.method === "PATCH")).toHaveLength(0);
  });

  test("delete は 204 を成功として stderr に確認を出す", async () => {
    const r = await ctx.run(["snapshot", "blueprints", "delete", "bp-org-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe("");
    expect(r.err).toContain("bp-org-1");
    const call = ctx.fake.log.find(
      (l) => l.method === "DELETE" && l.path === `${BLUEPRINTS}/bp-org-1`,
    );
    expect(call).toBeDefined();
  });

  test("contents は presigned URL の TSV", async () => {
    const r = await ctx.run(["snapshot", "blueprints", "contents", "bp-org-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "url\texpires_at",
        "https://files.example.com/presigned/blueprint.yaml\t2026-01-03T00:26:40.000Z",
      ),
    );
  });
});

describe("snapshot blueprints files", () => {
  const FILES = `${BLUEPRINTS}/bp-org-1/files`;

  test("list は data envelope を TSV に展開する", async () => {
    const r = await ctx.run([
      "snapshot",
      "blueprints",
      "files",
      "list",
      "bp-org-1",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "file_id\tname\tenv_var_name\tsize_bytes\tcreated_at\tupdated_at",
        "bf-1\tnpm-token.txt\tNPM_TOKEN\t42\t2026-01-01T00:00:00.000Z\t2026-01-02T00:00:00.000Z",
      ),
    );
  });

  test("upload は multipart POST に name クエリを載せる", async () => {
    writeFileSync(join(ctx.sb.dir, "token.txt"), "secret-token-value");
    const r = await ctx.run([
      "snapshot",
      "blueprints",
      "files",
      "upload",
      "bp-org-1",
      "token.txt",
      "--name",
      "npm-token.txt",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.method === "POST" && l.path === FILES);
    expect(call).toBeDefined();
    expect(call?.query.get("name")).toBe("npm-token.txt");
    expect(call?.body).toContain('name="file"; filename="token.txt"');
    expect(call?.body).toContain("secret-token-value");
    expect(r.out).toContain("bf-1\tnpm-token.txt");
  });

  test("upload は存在しないファイルで exit 2", async () => {
    const r = await ctx.run([
      "snapshot",
      "blueprints",
      "files",
      "upload",
      "bp-org-1",
      "nope.txt",
      "--name",
      "x",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(2);
  });

  test("delete は 204 を成功として返す", async () => {
    const r = await ctx.run([
      "snapshot",
      "blueprints",
      "files",
      "delete",
      "bp-org-1",
      "bf-1",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.method === "DELETE" && l.path === `${FILES}/bf-1`);
    expect(call).toBeDefined();
  });
});

describe("snapshot builds", () => {
  test("list は cursor pagination を辿って全ページの TSV", async () => {
    const r = await ctx.run(["snapshot", "builds", "list", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        BUILD_TSV_HEAD,
        "build-1\tsucceeded\tmanual\ttrue\t2026-01-01T00:00:00.000Z\t2026-01-01T00:01:40.000Z\t2026-01-02T00:00:00.000Z\tuser-1",
        "build-2\trunning\tmanual\tfalse\t2026-01-01T00:00:00.000Z\t2026-01-01T00:01:40.000Z\t2026-01-02T00:00:00.000Z\tuser-1",
      ),
    );
    const calls = ctx.fake.log.filter((l) => l.path === BUILDS);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.query.get("after")).toBe("cur-2");
    expect(calls[0]?.query.get("first")).toBe("200");
  });

  test("list --status/--active/--limit はクエリに載る", async () => {
    const r = await ctx.run([
      "snapshot",
      "builds",
      "list",
      "--status",
      "running",
      "--active",
      "--limit",
      "1",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const calls = ctx.fake.log.filter((l) => l.path === BUILDS);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.query.get("status")).toBe("running");
    expect(calls[0]?.query.get("active")).toBe("true");
    expect(calls[0]?.query.get("first")).toBe("1");
  });

  test("get / logs は詳細 TSV", async () => {
    const r = await ctx.run(["snapshot", "builds", "get", "build-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("build-1\tsucceeded");

    const logs = await ctx.run(["snapshot", "builds", "logs", "build-1", "--org", "org-x"]);
    expect(logs.code).toBe(0);
    expect(logs.out).toContain("url\texpires_at");
    expect(logs.out).toContain("presigned/blueprint.yaml");
  });

  test("create は --yes 無しだと exit 2 で API を叩かない", async () => {
    const r = await ctx.run(["snapshot", "builds", "create", "--org", "org-x"]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("--yes");
    expect(ctx.fake.log.filter((l) => l.method === "POST" && l.path === BUILDS)).toHaveLength(0);
  });

  test("create --yes は POST /builds を投げる", async () => {
    const r = await ctx.run(["snapshot", "builds", "create", "--yes", "--org", "org-x"]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.method === "POST" && l.path === BUILDS);
    expect(call).toBeDefined();
    expect(r.out).toContain("build-1\tsucceeded");
  });

  test("cancel は POST /builds/{id}/cancel", async () => {
    const r = await ctx.run(["snapshot", "builds", "cancel", "build-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) => l.method === "POST" && l.path === `${BUILDS}/build-1/cancel`,
    );
    expect(call).toBeDefined();
  });

  test("pin は POST /builds/{id}/pin、unpin は DELETE /pin で 204", async () => {
    const pin = await ctx.run(["snapshot", "builds", "pin", "build-1", "--org", "org-x"]);
    expect(pin.code).toBe(0);
    expect(
      ctx.fake.log.find((l) => l.method === "POST" && l.path === `${BUILDS}/build-1/pin`),
    ).toBeDefined();

    const unpin = await ctx.run(["snapshot", "builds", "unpin", "build-1", "--org", "org-x"]);
    expect(unpin.code).toBe(0);
    expect(
      ctx.fake.log.find((l) => l.method === "DELETE" && l.path === `${BUILDS}/build-1/pin`),
    ).toBeDefined();
  });

  test("API が否なら exit 1", async () => {
    const fake = startFake({
      statuses: { [BLUEPRINTS]: { status: 403, detail: "missing permission" } },
    });
    const sb = makeSandbox();
    try {
      const r = await runCli(sb, ["snapshot", "blueprints", "list", "--org", "org-x"], {
        DEVIN_API_BASE_URL: fake.url,
        DEVIN_API_KEY: API_KEY,
      });
      expect(r.code).toBe(1);
      expect(r.err).toContain("missing permission");
    } finally {
      fake.stop();
      removeSandbox(sb);
    }
  });

  test("create --json は生の Blueprint を返す", async () => {
    const r = await ctx.run(["snapshot", "blueprints", "create", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(SNAPSHOT_BLUEPRINT_ORG);
  });

  test("--status の不正値は usage エラー", async () => {
    const r = await ctx.run(["snapshot", "builds", "list", "--status", "bogus", "--org", "org-x"]);
    expect(r.code).toBe(2);
  });
});
