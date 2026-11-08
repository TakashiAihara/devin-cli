# devin-cli

Devin API v3 を CLI から使うツール。Bun + TypeScript で書かれている。

## 必要なもの

- [Bun](https://bun.sh) 1.4.3 以上
- Devin API の credential（Personal Access Token または Service User key。`cog_` で始まる Bearer token）

## セットアップ

```sh
git clone https://github.com/TakashiAihara/devin-cli.git
cd devin-cli
bun install
```

## 使い方

```sh
bun run start -- --help
bun run start -- self
bun run start -- billing --days 30
bun run start -- consumption daily --days 7
bun run start -- metrics usage --days 30
bun run start -- sessions list --limit 20
```

グローバルに使いたい場合は `bun link` するか `bun build --compile` でバイナリを作る（リリースバイナリ配布は今後対応）。

シェル補完は `devin-cli completion bash|zsh|fish` でスクリプトを出力できる。例 (bash):

```sh
devin-cli completion bash > ~/.devin-cli-completion.bash
echo 'source ~/.devin-cli-completion.bash' >> ~/.bashrc
```

## コマンド

| コマンド | 説明 |
| --- | --- |
| `self` | `GET /v3/self`。認証と principal の確認 |
| `billing [--days N]` | 直近 N 暦日の ACU 消費サマリ（合計・製品別・日別） |
| `consumption daily [--days N]` | 組織の日次消費 |
| `consumption user [user_id] [--days N]` | ユーザーの日次消費（省略時は self の user_id） |
| `consumption service-user <id> [--days N]` | service user の日次消費 |
| `consumption session <id> [--days N]` | session の日次消費 |
| `metrics <name> [--days N]` | `usage` / `sessions` / `prs` / `searches` / `dau` / `wau` / `mau` / `active-users` |
| `sessions list [--limit N]` | セッション一覧（cursor ページネーション。`--status`/`--tag`/`--origin`/`--archived` 等で絞れる） |
| `sessions get <id>` | セッション詳細 |
| `sessions messages <id> [--limit N]` | セッションのメッセージ一覧 |
| `sessions insights [id]` | insights。ID 省略時は組織全体の一覧 |
| `sessions attachments <id>` | セッションの添付一覧 |
| `sessions create --prompt <text>` | セッション作成（**実費が発生する**。`--prompt -` で stdin から読む） |
| `sessions archive <id>` | セッションを archive |
| `sessions tags get/add/set <id> [tags...]` | タグの一覧・追加・全置換 |
| `sessions delete <id> --yes` | セッション終了（破壊的。`--yes` 必須、無いと dry-run で exit 2） |
| `completion <shell>` | bash / zsh / fish 向けの補完スクリプトを stdout に出す |

`--org <id>` で org を明示できる。省略時は `--org` > `DEVIN_ORG_ID` > config `org_id` > `GET /v3/self` の順で解決する。

出力は既定で TSV。`--json` で生 JSON。

## 環境変数

| 変数 | 説明 | 既定 |
| --- | --- | --- |
| `DEVIN_API_KEY` | `cog_` トークン（PAT / service user 共通） | 必須 |
| `DEVIN_ORG_ID` | org ID | 省略時は自動解決 |
| `DEVIN_API_BASE_URL` | API の origin | `https://api.devin.ai` |
| `DEVIN_API_TIMEOUT` | API の 1 リクエストあたりの時間切れ（秒） | 20 |
| `DEVIN_COMMAND_TIMEOUT` | 設定の `*_command` の時間切れ（秒） | 60 |

## 設定ファイル

`$XDG_CONFIG_HOME/devin-cli/config.toml`（`XDG_CONFIG_HOME` が無ければ `~/.config/devin-cli/config.toml`）:

```toml
api_key_command = "infisical secrets get DEVIN_API_KEY --plain"  # sh -c で実行、stdout 1 行が秘密
org_id = "org-..."
api_base_url = "https://api.devin.ai"
```

machine identity や secret manager の wrapper 経由で env に注入し、1 本だけ取り出す形でもよい（コマンドの stdout に秘密だけが出ること）:

```toml
api_key_command = "op read op://Private/devin-api-key/credential"  # 1Password CLI の例
```

秘密の平文を書くキーは無い。env が `*_command` より優先される。

## 権限

- consumption 系: `ViewOrgConsumption`
- metrics 系: `ViewOrgMetrics`
- sessions 系: セッションの read / write 権限（一覧・詳細・messages・insights・attachments の read と、create / archive / tags / delete の write）

PAT / service user に権限を付けて発行する。Pro plan (self-serve) では org scope の consumption / metrics / sessions ともに動作確認済み。`--days` の上限は 100（consumption / metrics とも。CLI 側でも検査する）。

**`sessions create` は実費（ACU）が発生する操作**。`--max-acu` で上限を付けられる。**`sessions delete` はセッションを終了する破壊的操作**で、`--yes` を付けない限り dry-run（対象の表示のみ）で exit 2 になる。

**enterprise scope (`/v3/enterprise/*`, `/v3beta1/enterprise/*`) は対象外**。これらのエンドポイントは Enterprise plan 専用で、Pro/self-serve では全て 403 を返す（実測済み）。そのため org 管理・members/service-users 管理・git-providers・audit-logs 等の enterprise 系コマンドは実装していない。Enterprise plan を使う場合は別途対応が必要（issue #32 参照）。

## 日付の扱い

- **consumption**: 日境界は UTC-8 固定（Devin docs の "midnight PST" = 08:00 UTC。夏時間には従わない）。`--days N` は今日を含む N 暦日で、`time_after` は UTC-8 の日境界に揃う。`date` フィールドは `YYYY-MM-DD`（UTC-8）で表示する
- **metrics**: バケットは UTC 日（実測: `start_time` が 00:00:00Z 起点）。`--days N` の窓も UTC 0 時に揃え、`dau`/`wau`/`mau`/`active-users` の日付は UTC の `YYYY-MM-DD` で表示する

## 開発

```sh
bun run check        # typecheck + lint + format:check + test
bun run sync:openapi # docs.devin.ai から OpenAPI spec を再生成
bun run generate     # spec から Orval クライアントを再生成
```

exit code: 0=成功、1=API が否と答えた、2=使い方・秘密・通信の誤り、70=想定外の内部エラー。
