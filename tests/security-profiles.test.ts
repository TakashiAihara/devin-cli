import { describe, expect, test } from "bun:test";
import { tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

const HEADER =
  "profile_id\tname\tenforcement_level\tgit_access_level\tdevin_mcp_read_only\tremove_github_cli_token\tcreated_at\tupdated_at";
const ROW =
  "sp-1\tBaseline\trecommended\tread_only\tfalse\ttrue\t2026-01-01T00:00:00.000Z\t2026-01-02T00:00:00.000Z";

describe("security-profiles", () => {
  test("list は TSV で出す", async () => {
    const r = await ctx.run(["security-profiles", "list", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv(HEADER, ROW));
    expect(
      ctx.fake.log.some((l) => l.path === "/v3beta1/organizations/org-x/security-profiles"),
    ).toBe(true);
  });

  test("list --json は {items, total}", async () => {
    const r = await ctx.run(["security-profiles", "list", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out) as { items: { profile_id: string }[]; total: number };
    expect(j.items[0]?.profile_id).toBe("sp-1");
    expect(j.total).toBe(1);
  });

  test("get は 1 行 TSV", async () => {
    const r = await ctx.run(["security-profiles", "get", "sp-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv(HEADER, ROW));
  });

  test("get missing は exit 1", async () => {
    const r = await ctx.run(["security-profiles", "get", "missing", "--org", "org-x"]);
    expect(r.code).toBe(1);
  });

  test("create は指定項目を POST する", async () => {
    const r = await ctx.run([
      "security-profiles",
      "create",
      "--org",
      "org-x",
      "--name",
      "NewProfile",
      "--enforcement-level",
      "mandatory",
      "--git-access-level",
      "read_write",
      "--devin-mcp-read-only",
      "true",
      "--remove-github-cli-token",
      "false",
      "--mcp-server",
      "github",
      "--mcp-server",
      "notion",
      "--net-policy-json",
      '{"allow":[{"hostname":"*.example.com"}]}',
      "--slack-dm-scope",
      "org_members",
    ]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("sp-new");
    const call = ctx.fake.log.find(
      (l) => l.path === "/v3beta1/organizations/org-x/security-profiles",
    );
    expect(call?.method).toBe("POST");
    expect(JSON.parse(call?.body ?? "{}")).toEqual({
      name: "NewProfile",
      enforcement_level: "mandatory",
      git_access_level: "read_write",
      devin_mcp_read_only: true,
      remove_github_cli_token: false,
      mcp_config: { servers: ["github", "notion"] },
      net_policy: { allow: [{ hostname: "*.example.com" }] },
      slack_dm_scope: "org_members",
    });
  });

  test("create は --name 無しで exit 2 (API を叩かない)", async () => {
    const r = await ctx.run(["security-profiles", "create", "--org", "org-x"]);
    expect(r.code).toBe(2);
    expect(
      ctx.fake.log.filter((l) => l.path === "/v3beta1/organizations/org-x/security-profiles"),
    ).toHaveLength(0);
  });

  test("create は不正な enum で exit 2", async () => {
    const r = await ctx.run([
      "security-profiles",
      "create",
      "--org",
      "org-x",
      "--name",
      "x",
      "--enforcement-level",
      "bogus",
    ]);
    expect(r.code).toBe(2);
  });

  test("update は指定項目だけを PATCH する", async () => {
    const r = await ctx.run([
      "security-profiles",
      "update",
      "sp-1",
      "--org",
      "org-x",
      "--enforcement-level",
      "mandatory",
      "--clear-mcp-config",
      "--slack-dm-scope",
      "null",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) => l.path === "/v3beta1/organizations/org-x/security-profiles/sp-1",
    );
    expect(call?.method).toBe("PATCH");
    // PATCH: 指定した 3 項目だけが body に入る (name 等は送らない)
    expect(JSON.parse(call?.body ?? "{}")).toEqual({
      enforcement_level: "mandatory",
      mcp_config: null,
      slack_dm_scope: null,
    });
  });

  test("update は壊れた JSON 項目で exit 2", async () => {
    const r = await ctx.run([
      "security-profiles",
      "update",
      "sp-1",
      "--org",
      "org-x",
      "--net-policy-json",
      "not-json",
    ]);
    expect(r.code).toBe(2);
  });

  test("delete は 204 を正常終了として扱う", async () => {
    const r = await ctx.run(["security-profiles", "delete", "sp-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe("deleted\tsp-1\n");
    const call = ctx.fake.log.find(
      (l) => l.path === "/v3beta1/organizations/org-x/security-profiles/sp-1",
    );
    expect(call?.method).toBe("DELETE");
  });

  test("delete --json", async () => {
    const r = await ctx.run(["security-profiles", "delete", "sp-1", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual({ profile_id: "sp-1", deleted: true });
  });
});
