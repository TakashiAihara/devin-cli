import { describe, expect, test } from "bun:test";
import { tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

const HEADER = "scope\tselection\tprofile_id\tprofile_scope";
const ROWS = tsv(HEADER, "default\tprofile\tsp-1\torg", "automations_default\tinherit\t-\t-");

describe("security-profile-settings", () => {
  test("get は default / automations_default を TSV で出す", async () => {
    const r = await ctx.run(["security-profile-settings", "get", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(ROWS);
    expect(
      ctx.fake.log.some((l) => l.path === "/v3beta1/organizations/org-x/security-profile-settings"),
    ).toBe(true);
  });

  test("get --json は生 JSON", async () => {
    const r = await ctx.run(["security-profile-settings", "get", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out) as { default: { selection: string } };
    expect(j.default.selection).toBe("profile");
  });

  test("update --default none は {selection:none} を PATCH する", async () => {
    const r = await ctx.run([
      "security-profile-settings",
      "update",
      "--org",
      "org-x",
      "--default",
      "none",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) => l.path === "/v3beta1/organizations/org-x/security-profile-settings",
    );
    expect(call?.method).toBe("PATCH");
    expect(call?.body).toEqual({ default: { selection: "none" } });
    // fake は PATCH body の default をそのまま返す
    expect(r.out).toContain("default\tnone\t-\t-");
  });

  test("update --default profile --default-profile", async () => {
    const r = await ctx.run([
      "security-profile-settings",
      "update",
      "--org",
      "org-x",
      "--default",
      "profile",
      "--default-profile",
      "sp-2",
      "--automations-default",
      "inherit",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) => l.path === "/v3beta1/organizations/org-x/security-profile-settings",
    );
    expect(call?.body).toEqual({
      default: { selection: "profile", profile_id: "sp-2" },
      automations_default: { selection: "inherit" },
    });
  });

  test("update --default profile で profile ID 無しは exit 2", async () => {
    const r = await ctx.run([
      "security-profile-settings",
      "update",
      "--org",
      "org-x",
      "--default",
      "profile",
    ]);
    expect(r.code).toBe(2);
    expect(
      ctx.fake.log.filter(
        (l) => l.path === "/v3beta1/organizations/org-x/security-profile-settings",
      ),
    ).toHaveLength(0);
  });

  test("update --default-profile だけでは exit 2", async () => {
    const r = await ctx.run([
      "security-profile-settings",
      "update",
      "--org",
      "org-x",
      "--default-profile",
      "sp-1",
    ]);
    expect(r.code).toBe(2);
  });

  test("update は対象無しで exit 2", async () => {
    const r = await ctx.run(["security-profile-settings", "update", "--org", "org-x"]);
    expect(r.code).toBe(2);
  });
});
