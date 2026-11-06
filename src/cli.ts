#!/usr/bin/env bun
import { Command } from "commander";
import { runSelf } from "./commands/self.ts";
import { VERSION } from "./version.ts";

const JSON_FLAG = "--json";
const JSON_HELP = "TSV ではなく JSON を stdout に出す";

const program = new Command();
program.exitOverride((e) => process.exit(e.exitCode === 0 ? 0 : 2));

program
  .name("devin-cli")
  .description("Devin API v3 のセルフ情報・消費量・metrics")
  .version(VERSION);

program.addHelpText(
  "after",
  `
環境変数:
  DEVIN_API_KEY          cog_ で始まる PAT / service user key
  DEVIN_ORG_ID           org ID (省略時は --org > env > config > /v3/self の順で解決)
  DEVIN_API_BASE_URL     既定 https://api.devin.ai (origin のみ)
  DEVIN_API_TIMEOUT      API の時間切れ (秒。既定 20)
  DEVIN_COMMAND_TIMEOUT  設定の *_command の時間切れ (秒。既定 60)

秘密と接続先は env か設定ファイルで渡す。設定ファイルは
$XDG_CONFIG_HOME/devin-cli/config.toml (XDG_CONFIG_HOME が無ければ ~/.config/devin-cli/config.toml)。
api_key_command / org_id / api_base_url が書ける。秘密の平文は書けない。
`,
);

program
  .command("self")
  .description("GET /v3/self。認証と principal の確認")
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { json?: boolean }) => {
    process.exit(await runSelf({ json: opts.json === true }));
  });

// 1 は相手が否と答えた、2 は使い方・秘密・通信の誤り、70 は想定外の内部エラー
program.parseAsync().catch((e: unknown) => {
  process.stderr.write(`error: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(70);
});
