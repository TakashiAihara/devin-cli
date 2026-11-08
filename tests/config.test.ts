import { describe, expect, test } from "bun:test";
import { API_KEY } from "./helpers/fake-devin.ts";
import { useFake, writeConfig } from "./helpers/cli.ts";

const ctx = useFake();

describe("config.toml", () => {
  test("api_key_command から秘密を取れる (env が無いとき)", async () => {
    writeConfig(ctx.sb, `api_key_command = "echo ${API_KEY}"\n`);
    const r = await ctx.run(["self"], { DEVIN_API_KEY: undefined });
    expect(r.code).toBe(0);
    expect(r.out).toContain("pat_user");
  });

  test("env の DEVIN_API_KEY が api_key_command より優先", async () => {
    writeConfig(ctx.sb, 'api_key_command = "echo cog_wrong"\n');
    const r = await ctx.run(["self"], { DEVIN_API_KEY: API_KEY });
    expect(r.code).toBe(0);
  });

  test("api_key_command が失敗したら exit 2", async () => {
    writeConfig(ctx.sb, 'api_key_command = "exit 1"\n');
    const r = await ctx.run(["self"], { DEVIN_API_KEY: undefined });
    expect(r.code).toBe(2);
    expect(r.err).toContain("api_key_command");
  });

  test("api_key_command が時間切れなら exit 2", async () => {
    writeConfig(ctx.sb, 'api_key_command = "sleep 30"\n');
    const r = await ctx.run(["self"], {
      DEVIN_API_KEY: undefined,
      DEVIN_COMMAND_TIMEOUT: "1",
    });
    expect(r.code).toBe(2);
    expect(r.err).toContain("返らない");
  });

  test("api_key_command の複数行出力は拒否して exit 2", async () => {
    writeConfig(ctx.sb, 'api_key_command = "echo a; echo b"\n');
    const r = await ctx.run(["self"], { DEVIN_API_KEY: undefined });
    expect(r.code).toBe(2);
    expect(r.err).toContain("複数行");
  });

  test("孫が pipe を握ったままでも待たずに exit 2", async () => {
    // 直下の sh は即終了するが、裏に回した sleep が stdout pipe を持ち続ける。
    // EOF 猶予のあと process group ごと殺すので、sleep 30 を待たずに終わるはず
    writeConfig(ctx.sb, 'api_key_command = "sleep 30 &"\n');
    const started = Date.now();
    const r = await ctx.run(["self"], { DEVIN_API_KEY: undefined });
    expect(r.code).toBe(2);
    expect(Date.now() - started).toBeLessThan(15_000);
  });

  test("api_base_url を config で差し替えられる", async () => {
    writeConfig(ctx.sb, `api_base_url = "${ctx.fake.url}"\n`);
    const r = await ctx.run(["self"], { DEVIN_API_BASE_URL: undefined });
    expect(r.code).toBe(0);
  });

  test("path 付きの api_base_url は exit 2", async () => {
    // api_key_command も書いて secret 解決を通し、apiBaseUrl() の検査まで届かせる
    writeConfig(
      ctx.sb,
      `api_key_command = "echo ${API_KEY}"\napi_base_url = "http://127.0.0.1:1/devin"\n`,
    );
    const r = await ctx.run(["self"], { DEVIN_API_KEY: undefined, DEVIN_API_BASE_URL: undefined });
    expect(r.code).toBe(2);
    expect(r.err).toContain("origin");
  });
});
