import { describe, expect, test } from "bun:test";
import {
  CODE_SCAN_FINDINGS,
  CODE_SCAN_METRICS,
  CODE_SCAN_PROFILE_DETAIL,
} from "./helpers/fake-devin.ts";
import { tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

describe("code-scans findings", () => {
  test("findings 一覧の TSV", async () => {
    const r = await ctx.run(["code-scans", "findings", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "finding_id\tscan_id\trepo_name\tseverity\tstatus\tpayoff\ttitle\tcategory\tcreated_at\tupdated_at\tpr_url",
        "finding-1\tscan-1\tacme/one\thigh\topen\tquick_win\tSQL injection in search\tsql-injection\t2026-01-01T00:00:00.000Z\t2026-01-02T00:00:00.000Z\t-",
      ),
    );
  });

  test("フィルタは query param に展開される (severity/status は repeat)", async () => {
    const r = await ctx.run([
      "code-scans",
      "findings",
      "--repo",
      "acme/one",
      "--scan",
      "scan-1",
      "--q",
      "injection",
      "--severity",
      "high",
      "--severity",
      "critical",
      "--status",
      "open",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/code-scans/findings");
    expect(call?.query.get("repo_name")).toBe("acme/one");
    expect(call?.query.get("scan_id")).toBe("scan-1");
    expect(call?.query.get("q")).toBe("injection");
    expect(call?.query.getAll("severity")).toEqual(["high", "critical"]);
    expect(call?.query.getAll("status")).toEqual(["open"]);
    expect(call?.query.get("first")).toBe("200");
  });

  test("不正な severity は exit 2 で API を叩かない", async () => {
    const r = await ctx.run(["code-scans", "findings", "--severity", "fatal"]);
    expect(r.code).toBe(2);
    expect(ctx.fake.log.filter((l) => l.path.includes("code-scans"))).toHaveLength(0);
  });

  test("--json は畳んだ page", async () => {
    const r = await ctx.run(["code-scans", "findings", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).items).toEqual(CODE_SCAN_FINDINGS.items);
  });
});

describe("code-scans metrics", () => {
  test("time_before/time_after 必須の metrics を TSV 1 行で出す", async () => {
    const r = await ctx.run(["code-scans", "metrics", "--org", "org-x", "--days", "7"]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/code-scans/metrics");
    expect(call?.query.get("time_after")).not.toBeNull();
    expect(call?.query.get("time_before")).not.toBeNull();
    expect(
      Number(call?.query.get("time_before")) - Number(call?.query.get("time_after")),
    ).toBeGreaterThanOrEqual(6 * 86400);
    const [header, row] = r.out.trimEnd().split("\n");
    expect(header).toBe(
      "scans_count\trepos_scanned_count\topen_critical_findings_count\topen_high_findings_count\topen_medium_findings_count\topen_low_findings_count\tprs_created_count\tprs_open_count\tprs_merged_count\tprs_closed_count\tavg_pr_time_to_merge_seconds\tavg_pr_open_duration_seconds",
    );
    expect(row).toBe("3\t2\t1\t2\t3\t0\t4\t1\t2\t1\t7200\t3600");
  });

  test("--json は生 JSON", async () => {
    const r = await ctx.run(["code-scans", "metrics", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(CODE_SCAN_METRICS);
  });
});

describe("code-scans scans", () => {
  test("scans 一覧の TSV", async () => {
    const r = await ctx.run(["code-scans", "scans", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "scan_id\trepo_name\trepo_full_name\tscan_type\tstatus\teffort\tcreated_at\tprofile\turl",
        "scan-1\tacme/one\tacme/one\tsecurity\tcompleted\tnormal\t2026-01-01T00:00:00.000Z\tsecurity-baseline\thttps://app.devin.ai/code-scan/scan-1",
      ),
    );
  });

  test("--repo/--type/--days は query param に展開", async () => {
    const r = await ctx.run([
      "code-scans",
      "scans",
      "--repo",
      "acme/one",
      "--type",
      "security",
      "--days",
      "30",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/code-scans/scans");
    expect(call?.query.get("repo_name")).toBe("acme/one");
    expect(call?.query.get("scan_type")).toBe("security");
    expect(call?.query.get("time_after")).not.toBeNull();
    expect(call?.query.get("time_before")).not.toBeNull();
  });

  test("--days 無しでは time パラメータを付けない", async () => {
    const r = await ctx.run(["code-scans", "scans", "--org", "org-x"]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/code-scans/scans");
    expect(call?.query.get("time_after")).toBeNull();
    expect(call?.query.get("time_before")).toBeNull();
  });

  test("不正な --type は exit 2", async () => {
    const r = await ctx.run(["code-scans", "scans", "--type", "bogus"]);
    expect(r.code).toBe(2);
  });
});

describe("code-scans profiles", () => {
  test("一覧の TSV", async () => {
    const r = await ctx.run(["code-scans", "profiles", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "profile_id\tname\tscan_type\tmode\tvisibility\torg_id\tcreated_at\tdescription",
        "prof-1\tsecurity-baseline\tsecurity\tdiscover\torg\torg-x\t2026-01-01T00:00:00.000Z\tdefault security profile",
      ),
    );
  });

  test("profile_id 指定で詳細 (key/value)", async () => {
    const r = await ctx.run(["code-scans", "profiles", "prof-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) => l.path === "/v3/organizations/org-x/code-scans/profiles/prof-1",
    );
    expect(call).toBeDefined();
    const lines = r.out.trimEnd().split("\n");
    expect(lines[0]).toBe("key\tvalue");
    expect(lines).toContain("profile_id\tprof-1");
    expect(lines).toContain("name\tsecurity-baseline");
    expect(lines).toContain("include_globs\tsrc/**");
    expect(lines).toContain("validation_severities\tcritical,high");
    expect(lines).toContain("investigation_guidance\tlook for injection");
    expect(lines).toContain("org_id\torg-x");
  });

  test("詳細 --json は生 JSON", async () => {
    const r = await ctx.run(["code-scans", "profiles", "prof-1", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(CODE_SCAN_PROFILE_DETAIL);
  });
});
