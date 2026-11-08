import { describe, expect, test } from "bun:test";
import { API_KEY, REPO_INDEXING_STATUS, startFake } from "./helpers/fake-devin.ts";
import { makeSandbox, removeSandbox, runCli, tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

describe("repositories list", () => {
  test("cursor pagination を辿って全ページの TSV を出す", async () => {
    const r = await ctx.run(["repositories", "list", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "repo_path\trepo_name\trepo_full_name\trepo_language\tgit_connection_host\tlast_updated_at\tindexing_enabled",
        "acme/one\tone\tacme/one\tTypeScript\tgithub.com\t2026-01-01T00:00:00.000Z\ttrue",
        "acme/two\ttwo\tacme/two\t-\tgithub.com\t-\t-",
      ),
    );
    const calls = ctx.fake.log.filter((l) => l.path === "/v3/organizations/org-x/repositories");
    expect(calls).toHaveLength(2);
    expect(calls[0]?.query.get("after")).toBeNull();
    expect(calls[1]?.query.get("after")).toBe("cur-2");
    expect(calls[0]?.query.get("first")).toBe("100");
  });

  test("--limit で途中打ち切り (has_next_page は true のまま)", async () => {
    const r = await ctx.run(["repositories", "list", "--org", "org-x", "--limit", "1", "--json"]);
    expect(r.code).toBe(0);
    const body = JSON.parse(r.out);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].repo_path).toBe("acme/one");
    expect(body.has_next_page).toBe(true);
    expect(body.total).toBe(2);
    const calls = ctx.fake.log.filter((l) => l.path === "/v3/organizations/org-x/repositories");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.query.get("first")).toBe("1");
  });

  test("--filter は filter_name に渡る", async () => {
    const r = await ctx.run(["repositories", "list", "--org", "org-x", "--filter", "acme"]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/repositories");
    expect(call?.query.get("filter_name")).toBe("acme");
  });

  test("--json は畳んだ page 全体", async () => {
    const r = await ctx.run(["repositories", "list", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    const body = JSON.parse(r.out);
    expect(body.items.map((i: { repo_path: string }) => i.repo_path)).toEqual([
      "acme/one",
      "acme/two",
    ]);
    expect(body.has_next_page).toBe(false);
    expect(body.total).toBe(2);
  });

  test("API が否なら exit 1", async () => {
    const fake = startFake({
      statuses: {
        "/v3/organizations/org-x/repositories": { status: 403, detail: "missing permission" },
      },
    });
    const sb = makeSandbox();
    try {
      const r = await runCli(sb, ["repositories", "list", "--org", "org-x"], {
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
});

describe("repositories indexing", () => {
  test("list は indexing 済み一覧の TSV", async () => {
    const r = await ctx.run(["repositories", "indexing", "list", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "repository_path\tindexing_enabled\tbranches",
        "acme/one\ttrue\tmain,dev",
        "acme/two\tfalse\t-",
      ),
    );
  });

  test("set は PUT に repositories 配列を載せる", async () => {
    const r = await ctx.run([
      "repositories",
      "indexing",
      "set",
      "acme/one",
      "acme/two",
      "--branch",
      "main",
      "--branch",
      "dev",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) => l.method === "PUT" && l.path === "/v3/organizations/org-x/repositories/indexing",
    );
    expect(call).toBeDefined();
    expect(call?.body).toEqual({
      repositories: [
        { repository_path: "acme/one", branch_names: ["main", "dev"] },
        { repository_path: "acme/two", branch_names: ["main", "dev"] },
      ],
    });
    expect(r.out).toContain("acme/one\ttrue\tmain");
  });

  test("set は --branch 無しなら branch_names を付けない", async () => {
    const r = await ctx.run(["repositories", "indexing", "set", "acme/one", "--org", "org-x"]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.method === "PUT");
    expect(call?.body).toEqual({
      repositories: [{ repository_path: "acme/one" }],
    });
  });

  test("delete は DELETE に repository_paths を載せる", async () => {
    const r = await ctx.run([
      "repositories",
      "indexing",
      "delete",
      "acme/one",
      "acme/two",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) => l.method === "DELETE" && l.path === "/v3/organizations/org-x/repositories/indexing",
    );
    expect(call?.body).toEqual({
      repository_paths: ["acme/one", "acme/two"],
    });
  });
});

describe("repositories indexing-repo", () => {
  test("get は repository_path を encode して叩き、状態 TSV を出す", async () => {
    const r = await ctx.run(["repositories", "indexing-repo", "get", "acme/one", "--org", "org-x"]);
    expect(r.code).toBe(0);
    // "acme/one" は acme%2Fone として 1 セグメントで送られる
    const call = ctx.fake.log.find(
      (l) => l.path === "/v3/organizations/org-x/repositories/acme%2Fone/indexing",
    );
    expect(call).toBeDefined();
    expect(r.out).toBe(
      tsv(
        "indexing_enabled\tlatest_completed_search_index_job_status\tlatest_completed_wiki_index_job_status",
        "true\tcompleted\t-",
        "branch_name\tcommit\tstatus\tcreated_at\tjob_id",
        "main\tabc123\tcompleted\t2026-01-01T00:00:00.000Z\tjob-1",
        "dev\tdef456\tin_progress\t2026-01-02T00:00:00.000Z\tjob-2",
      ),
    );
  });

  test("get --json は生の RepoIndexingStatusResponse", async () => {
    const r = await ctx.run([
      "repositories",
      "indexing-repo",
      "get",
      "acme/one",
      "--org",
      "org-x",
      "--json",
    ]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(REPO_INDEXING_STATUS);
  });

  test("set は PUT に branch_names を載せる", async () => {
    const r = await ctx.run([
      "repositories",
      "indexing-repo",
      "set",
      "acme/one",
      "--branch",
      "release",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) => l.method === "PUT" && l.path.includes("/repositories/acme%2Fone/indexing"),
    );
    expect(call?.body).toEqual({ branch_names: ["release"] });
    expect(r.out).toContain("acme/one\ttrue\tmain");
  });

  test("delete は DELETE を投げる", async () => {
    const r = await ctx.run([
      "repositories",
      "indexing-repo",
      "delete",
      "acme/one",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) =>
        l.method === "DELETE" &&
        l.path === "/v3/organizations/org-x/repositories/acme%2Fone/indexing",
    );
    expect(call).toBeDefined();
    expect(r.out).toContain("acme/one");
  });
});

describe("repositories indexing-branch", () => {
  test("delete は path と branch を両方 encode して DELETE", async () => {
    const r = await ctx.run([
      "repositories",
      "indexing-branch",
      "delete",
      "acme/one",
      "feature/x",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.method === "DELETE" && l.path.includes("/branches/"));
    expect(call?.path).toBe(
      "/v3/organizations/org-x/repositories/acme%2Fone/indexing/branches/feature%2Fx",
    );
    expect(r.out).toContain("acme/one");
  });
});

describe("引数・org 解決", () => {
  test("--limit 0 は使い方エラー (exit 2)", async () => {
    const r = await ctx.run(["repositories", "list", "--limit", "0"]);
    expect(r.code).toBe(2);
  });

  test("indexing set は paths 必須", async () => {
    const r = await ctx.run(["repositories", "indexing", "set"]);
    expect(r.code).toBe(2);
  });
});
