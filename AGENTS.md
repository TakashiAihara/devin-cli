# AGENTS.md

Devin API v3 を CLI から使うツール。Bun + TypeScript で書かれており、API クライアントは Orval で OpenAPI spec から生成している。

## 必要なもの

- Bun 1.4.3 以上 (`engines.bun` 参照)
- Devin API の credential（`cog_` で始まる PAT / service user key）

## 主要コマンド

```sh
bun install              # 依存のインストール
bun run check            # typecheck + lint (oxlint) + format:check (oxfmt) + bun test
bun run start -- <args>  # CLI の実行。例: bun run start -- self / billing --days 30
bun run sync:openapi     # docs.devin.ai から OpenAPI spec を再取得して openapi/devin-v3.yaml を再生成
bun run generate         # openapi/devin-v3.yaml から Orval クライアントを再生成 (src/generated/)
```

lefthook の pre-commit で format-check / lint / typecheck / bun test が自動で走る。個別には `bun run typecheck` / `bun run lint` / `bun run format` / `bun test`。

## 構成メモ

- `src/cli.ts` — commander によるコマンド定義・引数パースの入口
- `src/commands/` — `self` / `billing` / `consumption` / `metrics` の各コマンド実装
- `src/api/` — API 層。`mutator.ts` (Orval の custom mutator = fetch + エラー変換)、`endpoints.ts` (生成クライアントへの薄いアダプタ)、`resolve-org.ts` (org ID / user_id の解決)
- `src/lib.ts` — config.toml 読み込み、secret 解決 (`*_command` 実行)、HTTP 送信、exit code まわりの共通処理
- `src/dates.ts` — consumption / metrics それぞれの日付窓の計算
- `src/generated/` と `openapi/devin-v3.yaml` は**生成物。手で編集しない**。直したい場合は spec 側 (`sync:openapi` の元になる docs) か Orval 設定を変える
- `tests/` — `bun test`。`tests/helpers/` に fake Devin API サーバを持つ

## secret の扱い

- config.toml (`$XDG_CONFIG_HOME/devin-cli/config.toml`、無ければ `~/.config/devin-cli/config.toml`) に秘密の平文を書くキーは無い
- API キーは `DEVIN_API_KEY` env、または config の `api_key_command` (`sh -c` で実行し stdout 1 行を秘密として使う。例: `infisical secrets get DEVIN_API_KEY --plain`) で渡す。env が `*_command` より優先される
- その他の env: `DEVIN_ORG_ID` / `DEVIN_API_BASE_URL` / `DEVIN_API_TIMEOUT` / `DEVIN_COMMAND_TIMEOUT` (詳細は README)

## 日付ルール

- **consumption**: 日境界は UTC-8 固定 (docs の "midnight PST" = 08:00 UTC。夏時間には従わない)。`--days N` は今日を含む N 暦日
- **metrics**: バケットは UTC 日 (00:00:00Z 起点)。`--days N` の窓も UTC 0 時に揃える
- 実装は `src/dates.ts` に閉じている。新しい日付処理を足すときは consumption と metrics で境界が違うことに注意

## exit code

0=成功、1=API が否と答えた、2=使い方・秘密・通信の誤り、70=想定外の内部エラー。
