import { describe, expect, test } from "bun:test";
import { METRICS_USAGE } from "./helpers/fake-devin.ts";
import { tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

describe("metrics", () => {
  test("usage はスカラー 1 行", async () => {
    const r = await ctx.run(["metrics", "usage", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv("sessions_count\tsearches_count\tprs_created_count\tprs_merged_count", "12\t34\t5\t3"),
    );
  });

  test("searches は 1 指標", async () => {
    const r = await ctx.run(["metrics", "searches", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv("searches_created_count", "34"));
  });

  test("prs は 8 指標の 1 行", async () => {
    const r = await ctx.run(["metrics", "prs", "--org", "org-x"]);
    expect(r.code).toBe(0);
    const [header, row] = r.out.trimEnd().split("\n");
    expect(header).toBe(
      "prs_created_count\tprs_opened_count\tprs_merged_count\tprs_closed_count\tprs_taken_over_count\tprs_taken_over_opened_count\tprs_taken_over_merged_count\tprs_taken_over_closed_count",
    );
    expect(row).toBe("5\t4\t3\t1\t2\t1\t1\t0");
  });

  test("dau は時系列の行 (バケット日付は UTC 日)", async () => {
    const r = await ctx.run(["metrics", "dau", "--org", "org-x"]);
    expect(r.code).toBe(0);
    // fixture は UTC 日バケット (00:00Z..23:59:59Z)。UTC-8 で整形すると前日にずれるので
    // "2026-01-01" と出ることが UTC 整形の証明になる
    expect(r.out).toBe(
      tsv(
        "start_time\tend_time\tactive_users",
        "2026-01-01\t2026-01-01\t2",
        "2026-01-02\t2026-01-02\t3",
      ),
    );
  });

  test("active-users は単一オブジェクトを 1 行で", async () => {
    const r = await ctx.run(["metrics", "active-users", "--org", "org-x"]);
    expect(r.code).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("2026-01-01\t2026-01-01\t2");
  });

  test("sessions は section/key/value のロング形式", async () => {
    const r = await ctx.run(["metrics", "sessions", "--org", "org-x"]);
    expect(r.code).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines[0]).toBe("section\tkey\tvalue");
    expect(lines).toContain("scalar\tsessions_created_count\t12");
    expect(lines).toContain("scalar\tavg_acus_per_session\t0.29");
    expect(lines).toContain("by_origin\twebapp\t5");
    expect(lines).toContain("by_size_created\ts\t6");
    expect(lines).toContain("by_size_merged_prs\tl\t0");
  });

  test("正しい path に UTC 日境界の time_after/time_before を付けて叩く", async () => {
    await ctx.run(["metrics", "usage", "--org", "org-x", "--days", "7"]);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/metrics/usage");
    expect(call).toBeDefined();
    const after = Number(call?.query.get("time_after"));
    const before = Number(call?.query.get("time_before"));
    expect(after % 86400).toBe(0); // metrics の窓は UTC 0 時境界
    expect(before - after).toBeGreaterThanOrEqual(6 * 86400);
    expect(before - after).toBeLessThan(8 * 86400);
  });

  test("--json は生 JSON", async () => {
    const r = await ctx.run(["metrics", "usage", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(METRICS_USAGE);
  });
});
