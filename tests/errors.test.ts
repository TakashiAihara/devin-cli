import { describe, expect, test } from "bun:test";
import { API_KEY, startFake } from "./helpers/fake-devin.ts";
import { makeSandbox, removeSandbox, runCli, useFake } from "./helpers/cli.ts";

const ctx = useFake();

describe("HTTP エラー", () => {
  test("403 ProblemDetail は exit 1 + detail が stderr", async () => {
    const fake = startFake({
      statuses: { "/v3/organizations": { status: 403, detail: "missing ViewOrgConsumption" } },
    });
    const sb = makeSandbox();
    try {
      const r = await runCli(sb, ["consumption", "daily", "--org", "org-x"], {
        DEVIN_API_BASE_URL: fake.url,
        DEVIN_API_KEY: API_KEY,
      });
      expect(r.code).toBe(1);
      expect(r.err).toContain("missing ViewOrgConsumption");
      expect(r.err).toContain("403");
    } finally {
      fake.stop();
      removeSandbox(sb);
    }
  });

  test("proxy の 502 HTML は exit 2 (CommError)", async () => {
    const fake = startFake({ proxyStatus: 502 });
    const sb = makeSandbox();
    try {
      const r = await runCli(sb, ["self"], {
        DEVIN_API_BASE_URL: fake.url,
        DEVIN_API_KEY: API_KEY,
      });
      expect(r.code).toBe(2);
      expect(r.err).toContain("届かなかった");
    } finally {
      fake.stop();
      removeSandbox(sb);
    }
  });

  test("fetch 失敗 (接続不能) は exit 2", async () => {
    // 誰も listen していない port を使う
    const r = await ctx.run(["self"], { DEVIN_API_BASE_URL: "http://127.0.0.1:1" });
    expect(r.code).toBe(2);
    expect(r.err).toContain("通信に失敗");
  });

  test("タイムアウトは exit 2", async () => {
    const fake = startFake({ hang: ["/v3/self"] });
    const sb = makeSandbox();
    try {
      const r = await runCli(sb, ["self"], {
        DEVIN_API_BASE_URL: fake.url,
        DEVIN_API_KEY: API_KEY,
        DEVIN_API_TIMEOUT: "1",
      });
      expect(r.code).toBe(2);
      expect(r.err).toContain("応答しない");
    } finally {
      fake.stop();
      removeSandbox(sb);
    }
  });
});
