import { describe, expect, test } from "bun:test";
import { CONSUMPTION } from "./helpers/fake-devin.ts";
import { tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

describe("consumption daily", () => {
  test("日別 TSV", async () => {
    const r = await ctx.run(["consumption", "daily", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "date\tacus\tdevin\tcascade\tterminal\tautomation\treview",
        "2026-01-01\t1.5\t1\t0.5\t0\t-\t-",
        "2026-01-02\t2\t1.5\t0.25\t0.25\t0\t-",
      ),
    );
  });

  test("--json は ConsumptionResponse", async () => {
    const r = await ctx.run(["consumption", "daily", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(CONSUMPTION);
  });
});

describe("consumption user", () => {
  test("user_id 指定で per-ID endpoint を叩く", async () => {
    const r = await ctx.run(["consumption", "user", "user-9", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(
      ctx.fake.log.some((l) => l.path === "/v3/organizations/org-x/consumption/daily/users/user-9"),
    ).toBe(true);
  });

  test("user_id 省略時は self の user_id を使う (self が 2 回呼ばれない)", async () => {
    const r = await ctx.run(["consumption", "user", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(
      ctx.fake.log.some((l) => l.path === "/v3/organizations/org-x/consumption/daily/users/user-1"),
    ).toBe(true);
    expect(ctx.fake.log.filter((l) => l.path === "/v3/self")).toHaveLength(1);
  });
});

describe("consumption service-user / session", () => {
  test("service-user は ID を path に入れる", async () => {
    const r = await ctx.run(["consumption", "service-user", "svc-9", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(
      ctx.fake.log.some(
        (l) => l.path === "/v3/organizations/org-x/consumption/daily/service-users/svc-9",
      ),
    ).toBe(true);
  });

  test("session は ID を path に入れる", async () => {
    const r = await ctx.run(["consumption", "session", "sess-9", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(
      ctx.fake.log.some(
        (l) => l.path === "/v3/organizations/org-x/consumption/daily/sessions/sess-9",
      ),
    ).toBe(true);
  });
});
