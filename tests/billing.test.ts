import { describe, expect, test } from "bun:test";
import { CONSUMPTION } from "./helpers/fake-devin.ts";
import { useFake } from "./helpers/cli.ts";

const ctx = useFake();

describe("billing", () => {
  test("サマリと日別を TSV で出す", async () => {
    const r = await ctx.run(["billing", "--org", "org-x", "--days", "30"]);
    expect(r.code).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines[0]).toBe("metric\tvalue");
    expect(lines).toContain("days\t30");
    expect(lines).toContain("total_acus\t3.5");
    expect(lines).toContain("acus_devin\t2.5");
    expect(lines).toContain("acus_cascade\t0.75");
    expect(lines).toContain("acus_terminal\t0.25");
    expect(lines).toContain("acus_automation\t0");
    expect(lines).toContain("acus_review\t-");
    expect(lines).toContain("date\tacus\tdevin\tcascade\tterminal\tautomation\treview");
    expect(lines).toContain("2026-01-01\t1.5\t1\t0.5\t0\t-\t-");
    expect(lines).toContain("2026-01-02\t2\t1.5\t0.25\t0.25\t0\t-");
  });

  test("--json は window 付きの生 JSON", async () => {
    const r = await ctx.run(["billing", "--org", "org-x", "--days", "1", "--json"]);
    expect(r.code).toBe(0);
    const body = JSON.parse(r.out);
    expect(body.total_acus).toBe(3.5);
    expect(body.consumption_by_date).toEqual(CONSUMPTION.consumption_by_date);
    expect(body.days).toBe(1);
    // time_after は今日(UTC-8)0時、time_before は現在。差は 86400 未満
    expect(body.window.time_before - body.window.time_after).toBeLessThan(86400);
    expect((body.window.time_after - 8 * 3600) % 86400).toBe(0);
  });

  test("time_after/time_before が fake に届く", async () => {
    await ctx.run(["billing", "--org", "org-x", "--days", "7"]);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/consumption/daily");
    expect(call).toBeDefined();
    const after = Number(call?.query.get("time_after"));
    const before = Number(call?.query.get("time_before"));
    expect((after - 8 * 3600) % 86400).toBe(0); // UTC-8 日境界に揃う
    expect(before - after).toBeGreaterThanOrEqual(6 * 86400);
    expect(before - after).toBeLessThan(8 * 86400);
  });
});
