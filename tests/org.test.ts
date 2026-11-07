import { describe, expect, test } from "bun:test";
import { API_KEY, SELF_SERVICE_USER, startFake } from "./helpers/fake-devin.ts";
import { makeSandbox, removeSandbox, runCli, useFake, writeConfig } from "./helpers/cli.ts";

const ctx = useFake();

describe("org 解決", () => {
  test("--org が最優先", async () => {
    await ctx.run(["consumption", "daily", "--org", "org-flag"], { DEVIN_ORG_ID: "org-env" });
    expect(ctx.fake.log.some((l) => l.path.startsWith("/v3/organizations/org-flag/"))).toBe(true);
  });

  test("env は config より優先", async () => {
    writeConfig(ctx.sb, 'org_id = "org-cfg"\n');
    await ctx.run(["consumption", "daily"], { DEVIN_ORG_ID: "org-env" });
    expect(ctx.fake.log.some((l) => l.path.startsWith("/v3/organizations/org-env/"))).toBe(true);
  });

  test("config は self フォールバックより優先", async () => {
    writeConfig(ctx.sb, 'org_id = "org-cfg"\n');
    await ctx.run(["consumption", "daily"]);
    expect(ctx.fake.log.some((l) => l.path.startsWith("/v3/organizations/org-cfg/"))).toBe(true);
    expect(ctx.fake.log.filter((l) => l.path === "/v3/self")).toHaveLength(0);
  });

  test("全部無ければ self の primary_billing_org_id (pat_user)", async () => {
    await ctx.run(["consumption", "daily"]);
    expect(ctx.fake.log.some((l) => l.path.startsWith("/v3/organizations/org-billing/"))).toBe(
      true,
    );
  });

  test("service_user の self は org_id を使う", async () => {
    const fake = startFake({ selfBody: SELF_SERVICE_USER });
    const sb = makeSandbox();
    try {
      const r = await runCli(sb, ["consumption", "daily"], {
        DEVIN_API_BASE_URL: fake.url,
        DEVIN_API_KEY: API_KEY,
      });
      expect(r.code).toBe(0);
      expect(fake.log.some((l) => l.path.startsWith("/v3/organizations/org-svc/"))).toBe(true);
    } finally {
      fake.stop();
      removeSandbox(sb);
    }
  });

  test("org を解決できなければ exit 2", async () => {
    const fake = startFake({
      selfBody: {
        principal_type: "service_user",
        service_user_id: "s",
        service_user_name: "n",
        org_id: null,
      },
    });
    const sb = makeSandbox();
    try {
      const r = await runCli(sb, ["consumption", "daily"], {
        DEVIN_API_BASE_URL: fake.url,
        DEVIN_API_KEY: API_KEY,
      });
      expect(r.code).toBe(2);
      expect(r.err).toContain("org");
    } finally {
      fake.stop();
      removeSandbox(sb);
    }
  });
});
