import { describe, expect, test } from "bun:test";
import { API_KEY, SELF_PAT, SELF_SERVICE_USER, startFake } from "./helpers/fake-devin.ts";
import { makeSandbox, removeSandbox, runCli, tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

describe("self", () => {
  test("TSV で principal と org を出す", async () => {
    const r = await ctx.run(["self"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "principal_type\tid\tname\torg_id\tdevin_sessions_org_id\tprimary_billing_org_id",
        "pat_user\tuser-1\tTest User\torg-self\t-\torg-billing",
      ),
    );
  });

  test("--json で生 JSON を出す", async () => {
    const r = await ctx.run(["self", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(SELF_PAT);
  });

  test("service_user の self も出せる", async () => {
    const fake = startFake({ selfBody: SELF_SERVICE_USER });
    const sb = makeSandbox();
    try {
      const r = await runCli(sb, ["self"], {
        DEVIN_API_BASE_URL: fake.url,
        DEVIN_API_KEY: API_KEY,
      });
      expect(r.code).toBe(0);
      expect(r.out).toContain("service_user\tsvc-1\tci-bot\torg-svc");
    } finally {
      fake.stop();
      removeSandbox(sb);
    }
  });

  test("401 は exit 2", async () => {
    const r = await ctx.run(["self"], { DEVIN_API_KEY: "cog_wrong" });
    expect(r.code).toBe(2);
    expect(r.err).toContain("401");
  });
});
