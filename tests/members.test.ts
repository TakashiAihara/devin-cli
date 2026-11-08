import { describe, expect, test } from "bun:test";
import { MEMBER_DETAIL } from "./helpers/fake-devin.ts";
import { tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

describe("members", () => {
  test("list は cursor を辿って全ページを TSV で出す", async () => {
    const r = await ctx.run(["members", "list", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "user_id\temail\tname\troles",
        "user-1\talice@example.com\tAlice\tAdmin",
        "user-2\tbob@example.com\tBob\tMember",
      ),
    );
    const calls = ctx.fake.log.filter(
      (l) => l.path === "/v3beta1/organizations/org-x/members/users",
    );
    expect(calls).toHaveLength(2);
    expect(calls[0]?.query.get("after")).toBeNull();
    expect(calls[1]?.query.get("after")).toBe("cur-2");
  });

  test("list --limit 1 は 1 ページ目だけ取る", async () => {
    const r = await ctx.run(["members", "list", "--org", "org-x", "--limit", "1"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv("user_id\temail\tname\troles", "user-1\talice@example.com\tAlice\tAdmin"),
    );
    expect(
      ctx.fake.log.filter((l) => l.path === "/v3beta1/organizations/org-x/members/users"),
    ).toHaveLength(1);
  });

  test("list --json は {items, total}", async () => {
    const r = await ctx.run(["members", "list", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out) as { items: { user_id: string }[]; total: number };
    expect(j.items.map((u) => u.user_id)).toEqual(["user-1", "user-2"]);
    expect(j.total).toBe(2);
  });

  test("get は直接 + IDP 由来の role を出す", async () => {
    const r = await ctx.run(["members", "get", "user-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "user_id\temail\tname\troles\tidp_roles",
        "user-1\talice@example.com\tAlice\tAdmin\teng-admins:Admin",
      ),
    );
  });

  test("get --json は生 JSON", async () => {
    const r = await ctx.run(["members", "get", "user-1", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(MEMBER_DETAIL);
  });

  test("get missing は exit 1", async () => {
    const r = await ctx.run(["members", "get", "missing", "--org", "org-x"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("404");
  });

  test("idp-users は IDP グループ由来のメンバーを出す", async () => {
    const r = await ctx.run(["members", "idp-users", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv("user_id\temail\tname\tidp_roles", "user-9\tcarol@example.com\tCarol\tsso-admins:Admin"),
    );
  });

  test("idp-users --json は {items}", async () => {
    const r = await ctx.run(["members", "idp-users", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out) as { items: { user_id: string }[] };
    expect(j.items[0]?.user_id).toBe("user-9");
  });
});
