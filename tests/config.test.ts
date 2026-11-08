import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  test("api_key_command の解決はプロセス内で 1 回だけ (API 呼び出しが複数あっても)", async () => {
    // user_id 省略の consumption user は /v3/self (org 解決) と consumption の 2 リクエストを投げる。
    // secret() はリクエストごとに呼ばれるが、api_key_command は 1 回しか走らないはず
    const countFile = join(ctx.sb.dir, "key-runs");
    writeConfig(ctx.sb, `api_key_command = "echo run >> ${countFile}; echo ${API_KEY}"\n`);
    const r = await ctx.run(["consumption", "user"], { DEVIN_API_KEY: undefined });
    expect(r.code).toBe(0);
    expect(ctx.fake.log).toHaveLength(2);
    expect(readFileSync(countFile, "utf8").trim().split("\n")).toHaveLength(1);
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

  test("孫が pipe を握ったままでも待たず、process group ごと殺す", async () => {
    // 直下の sh は即終了するが、裏に回した sleep が stdout pipe を持ち続ける。
    // EOF 猶予のあと process group ごと殺すので、sleep 30 を待たず、sleep 自体も死ぬはず
    const pidFile = join(ctx.sb.dir, "sleep.pid");
    writeConfig(ctx.sb, `api_key_command = "sleep 30 & echo $! > ${pidFile}"\n`);
    const started = Date.now();
    const r = await ctx.run(["self"], { DEVIN_API_KEY: undefined });
    expect(r.code).toBe(2);
    expect(Date.now() - started).toBeLessThan(15_000);

    const pid = Number(readFileSync(pidFile, "utf8").trim());
    expect(Number.isInteger(pid) && pid > 1).toBe(true);
    // SIGKILL の反映と zombie の回収を待つため少しだけ猶予を置いて存在確認する
    let alive = true;
    for (let i = 0; i < 20 && alive; i++) {
      try {
        process.kill(pid, 0);
        await Bun.sleep(100);
      } catch {
        alive = false;
      }
    }
    expect(alive).toBe(false);
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
