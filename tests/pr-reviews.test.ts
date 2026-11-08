import { describe, expect, test } from "bun:test";
import { tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

const PR_URL = "https://github.com/owner/repo/pull/42";
const HEADER = "commit_sha\tcreated_at\tpr_number\trepo_path\tstatus";
const ROW = "abc123def456\t2026-01-03T04:05:06Z\t42\tgithub.com/owner/repo\tcompleted";

describe("pr-reviews", () => {
  test("get は pr_url を query に付けて最新 review を返す", async () => {
    const r = await ctx.run(["pr-reviews", "get", PR_URL, "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv(HEADER, ROW));
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/pr-reviews");
    expect(call?.method).toBe("GET");
    expect(call?.query.get("pr_url")).toBe(PR_URL);
    expect(call?.query.get("commit_sha")).toBeNull();
  });

  test("get --commit-sha は query に載る", async () => {
    const r = await ctx.run([
      "pr-reviews",
      "get",
      PR_URL,
      "--org",
      "org-x",
      "--commit-sha",
      "abc123",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/pr-reviews");
    expect(call?.query.get("commit_sha")).toBe("abc123");
  });

  test("get --json は生 JSON", async () => {
    const r = await ctx.run(["pr-reviews", "get", PR_URL, "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out) as { status: string; pr_number: number };
    expect(j.status).toBe("completed");
    expect(j.pr_number).toBe(42);
  });

  test("get で review が無ければ exit 1", async () => {
    const r = await ctx.run([
      "pr-reviews",
      "get",
      "https://github.com/o/r/pull/missing",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("404");
  });

  test("create は {pr_url} を POST して pending を返す", async () => {
    const r = await ctx.run(["pr-reviews", "create", PR_URL, "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv(HEADER, ROW.replace("completed", "pending")));
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/pr-reviews");
    expect(call?.method).toBe("POST");
    expect(call?.body).toEqual({ pr_url: PR_URL });
  });
});
