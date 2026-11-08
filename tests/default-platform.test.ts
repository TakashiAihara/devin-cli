import { describe, expect, test } from "bun:test";
import { tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

const HEADER = "platform\toutpost_pool_id\toutpost_pool_name";

describe("default-platform", () => {
  test("get は現在値を TSV で出す", async () => {
    const r = await ctx.run(["default-platform", "get", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv(HEADER, "linux\t-\t-"));
    expect(
      ctx.fake.log.some((l) => l.path === "/v3beta1/organizations/org-x/default-platform"),
    ).toBe(true);
  });

  test("get --json は生 JSON", async () => {
    const r = await ctx.run(["default-platform", "get", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual({
      platform: "linux",
      outpost_pool_id: null,
      outpost_pool_name: null,
    });
  });

  test("set --platform は {platform} を PUT する", async () => {
    const r = await ctx.run(["default-platform", "set", "--org", "org-x", "--platform", "windows"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv(HEADER, "windows\t-\t-"));
    const call = ctx.fake.log.find(
      (l) => l.path === "/v3beta1/organizations/org-x/default-platform",
    );
    expect(call?.method).toBe("PUT");
    expect(JSON.parse(call?.body ?? "{}")).toEqual({ platform: "windows" });
  });

  test("set --outpost-pool-id は {outpost_pool_id} を PUT する", async () => {
    const r = await ctx.run([
      "default-platform",
      "set",
      "--org",
      "org-x",
      "--outpost-pool-id",
      "pool-1",
    ]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv(HEADER, "-\tpool-1\t-"));
    const call = ctx.fake.log.find(
      (l) => l.path === "/v3beta1/organizations/org-x/default-platform",
    );
    expect(JSON.parse(call?.body ?? "{}")).toEqual({ outpost_pool_id: "pool-1" });
  });

  test("set --clear は空 object を PUT して解除になる", async () => {
    const r = await ctx.run(["default-platform", "set", "--org", "org-x", "--clear"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv(HEADER, "-\t-\t-"));
    const call = ctx.fake.log.find(
      (l) => l.path === "/v3beta1/organizations/org-x/default-platform",
    );
    expect(JSON.parse(call?.body ?? "{}")).toEqual({});
  });

  test("set はフラグ無し・併用で exit 2", async () => {
    const none = await ctx.run(["default-platform", "set", "--org", "org-x"]);
    expect(none.code).toBe(2);
    const both = await ctx.run([
      "default-platform",
      "set",
      "--org",
      "org-x",
      "--platform",
      "linux",
      "--clear",
    ]);
    expect(both.code).toBe(2);
  });
});
