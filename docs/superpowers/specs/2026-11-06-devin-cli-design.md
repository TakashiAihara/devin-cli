# devin-cli 設計

- 作成日: 2026-11-06
- ステータス: ドラフト（Opus レビュー反映済み。ユーザーレビュー待ち）
- 変更履歴: Opus (claude-opus-5-5) のレビュー指摘 16 件を一次資料と突き合わせて採否し、採用分を反映

## 目的

Devin API v3 を CLI から使えるようにする。最優先は usage / billing / analytics で、契約プランが Pro (self-serve) でも動く organization scope を主対象にする。

## 前提（調査済みの事実）

- API ベース: `https://api.devin.ai/v3`。認証は `Authorization: Bearer cog_...` で、Personal Access Token (PAT) と Service User API Key は同じ形式・同じヘッダで使える
- 各 API ドキュメントページ (`docs.devin.ai/api-reference/v3/**.md`) に、そのエンドポイントの OpenAPI fragment が ````yaml v3-openapi.yaml` フェンスで埋め込まれている。手書きの spec は不要で、スクレイプ＋マージで機械生成できる
- `GET /v3/self` は無権限で呼べ、`principal_type`（`service_user` / `pat_user` / `devin_brain` / `windsurf_session` の 4 種）と org 系 ID (`org_id` / `devin_sessions_org_id` / `primary_billing_org_id`) を返す。org ID の自動検出に使う。`x-cog-org-id` ヘッダはこちらからは送らない
- consumption の org endpoint は「all plans, including Teams and self-serve」の注記があるが、**metrics の org ページには同じ注記が無い**。Pro で metrics が使えるかは consumption とは別に実測で確かめる必要がある
- consumption に必要な権限は `ViewOrgConsumption`、metrics は `ViewOrgMetrics`（いずれも org レベル）。PAT / service user に付与されていないと 403 になる
- consumption/daily/users・service-users・sessions は**一覧ではなく ID を取る per-ID endpoint**（例: `GET /v3/organizations/{org_id}/consumption/daily/users/{user_id}`）。応答は daily と同じ `ConsumptionResponse` で、cursor pagination は無い
- consumption の日境界は PST (UTC-8) の 0 時 = 08:00 UTC。クエリは `time_before` / `time_after` の Unix 秒
- 一覧系（sessions 等、consumption 以外）は cursor pagination (`after` / `first` → `PaginatedResponse` with `end_cursor` / `has_next_page`)
- Orval の fetch client は既定で `{ data, status, headers }` を返す型を生成する（`override.fetch.includeHttpResponseReturnType` の既定が `true`）。データを直接返すには `false` を設定する必要がある
- Pro plan で org endpoint が実際に通るかは PAT を作って `GET /v3/self` → `consumption/daily` と `metrics/usage` を叩くまで確定しない

## スコープ

### v1 で作るもの

- OpenAPI spec の生成パイプラインと生成物（v3 全エンドポイント）
- Orval による型付きクライアント
- CLI コマンド: `self` / `billing` / `consumption` / `metrics`（analytics 系のみ）
- テスト（fake Devin サーバ + bun test）

### スコープ外

- sessions / knowledge / playbooks / secrets 等の書き込み・操作系コマンド（クライアントには生成されるが CLI には出さない）
- metrics の `min_sessions` / `min_searches` / `user_ids` 等の絞り込み引数（必要になったら追加）
- リリースバイナリ配布（`scripts/build.ts` / `install.sh` / GitHub Release workflow）→ issue #1 に切り出し済み
- v1/v2 legacy API

## アーキテクチャ

```
docs.devin.ai の各 .md ページ
        │  scripts/sync-openapi.ts (bun run sync:openapi)
        ▼
openapi/devin-v3.yaml  ──コミット──▶  orval (bun run generate)
        │                                │
        │                                ▼
        │                          src/generated/ (コミット)
        │                                │
        ▼                                ▼
src/api/mutator.ts ──▶ src/lib.ts の send()（proxy HTML 判定・CommError を再利用）
        │
        ▼
src/commands/{self,billing,consumption,metrics}.ts
        │
        ▼
src/cli.ts (commander) → bin: devin-cli
```

## OpenAPI spec パイプライン（`scripts/sync-openapi.ts`）

1. `https://docs.devin.ai/_llms/en/api.txt` を取得し、`api-reference/v3/` を含む `.md` URL を収集
2. 各ページを並列（同時 8 本程度）で fetch し、````yaml v3-openapi.yaml` フェンスの中身を抽出
3. `yaml` パッケージでパースし、fragment ごとに `paths` / `components.schemas` / `components.securitySchemes` をマージ
   - `components.schemas` は名前で dedupe。同名で内容が異なる場合は警告を出して先勝ち（同一バックエンド生成なので実際には一致するはず）
   - `$ref` は `#/components/schemas/...` 形式で完結しているため、マージ後もそのまま解決できる
4. `operationId` を正規化: `method` + path セグメントから camelCase を生成（例: `GET /v3/organizations/{org_id}/consumption/daily` → `getOrganizationsOrgIdConsumptionDaily`、`GET /v3/self` → `getSelf`）。**重複があれば警告ではなく失敗終了**
5. `servers: [{ url: "https://api.devin.ai" }]`、`info`、`security`（bearerAuth）を正規化して `openapi/devin-v3.yaml` に出力。キーはソートして diff を安定させる
6. フェンスが無いページは skip するが、**skip したページ数と名前を出力する**。抽出した path が閾値（50 未満）を切ったら docs 側の形が変わった可能性があるので失敗終了。ページが 1 つも取れなかった場合も非 0
7. ネットワーク失敗したページはリトライ 1 回

- 依存: `yaml`（devDependencies）
- `bun run sync:openapi` で再実行可能。ドキュメントに新エンドポイントが追加されたら再実行するだけで spec が追従する

## Orval クライアント

- devDependencies に `orval`（導入時に公開 7 日以上経過した安定版を選ぶ）
- `orval.config.ts`:
  - `input: openapi/devin-v3.yaml`
  - `output.target: src/generated/`、`mode: 'tags-split'`（タグごとにファイル分割。うまくいかなければ `'split'`）
  - `client: 'fetch'`（Bun ネイティブ fetch）
  - `override.fetch.includeHttpResponseReturnType: false`（`{data,status,headers}` ではなくデータを直接返す型にする）
  - `override.mutator: { path: './src/api/mutator.ts', name: 'apiFetch' }`
- 生成物は `src/generated/` にコミット（`bun build --compile` やテストが orval 無しで通るように）
- `src/api/mutator.ts` の責務:
  - 受け取った URL の origin を `apiBaseUrl()` の値に書き換える（spec の server は `https://api.devin.ai` 固定だが、テストやプロキシ用に `DEVIN_API_BASE_URL` / config `api_base_url` で差し替え可能にする）
  - `Authorization: Bearer <DEVIN_API_KEY>` を注入（`secret()` 経由。env → config `api_key_command` の順）
  - 実際の HTTP は `src/lib.ts` の `send()` を呼ぶ（proxy が返す 502/503/504 HTML を「届かなかった」(exit 2) と扱う判定と `CommError` をそのまま使う。応答の形が想定と違う場合は exit 70 に流す既存の構造も維持）
  - `send()` の結果が `!ok` → body を `ProblemDetail` としてパースし、`detail`/`title`/`status` を持つ `ApiError`（`ExitError` 継承）を throw。HTTP status に応じた exit code は下記「エラー処理」に従う
  - `AbortSignal.timeout(apiTimeoutMs())` でタイムアウト
  - 成功時は body を JSON parse して返す（`includeHttpResponseReturnType: false` に合わせて `{data,...}` ではなくデータ本体）
- mutator の signature は Orval fetch client の規約に従う（実装時に生成コードと照合して確定する）

## CLI

- bin 名: `devin-cli`（公式 `devin` CLI との衝突回避）。`package.json` の `bin` と `src/cli.ts` の shebang は 9router-cli と同じ形
- フレームワーク: commander。`--json` フラグで生 JSON、それ以外は TSV（`cell()` で null → `-`、文字列セルは `oneLine()` を通してタブ・改行で列が崩れないようにする）。exit code は 9router-cli と同じ規約（下記「エラー処理」）
- `src/version.ts` に `VERSION` 定数（`--version` 用。`__BUILD_VERSION__` define によるリリース版埋め込みは issue #1 側で対応）

### コマンド

```
devin-cli self [--json]
devin-cli billing [--days N] [--org ID] [--json]
devin-cli consumption daily [--days N] [--org ID] [--json]
devin-cli consumption user [user_id] [--days N] [--org ID] [--json]
devin-cli consumption service-user <service_user_id> [--days N] [--org ID] [--json]
devin-cli consumption session <session_id> [--days N] [--org ID] [--json]
devin-cli metrics <usage|sessions|prs|searches|dau|wau|mau|active-users> [--days N] [--org ID] [--json]
```

- `self`: `GET /v3/self`。principal_type・名前・各 org ID を出す。認証確認も兼ねる
- `billing`: `consumption/daily` を直近 N 日（既定 30）で取得し、期間合計 ACU・`acus_by_product` の製品別合計・直近数日の日別を出す。「今の請求状況」を 1 コマンドで見るための顔。`consumption daily` と同じ endpoint だが、こちらは集計サマリ重視の表示
- `consumption daily`: 日別 ACU の TSV（date / acus / devin / cascade / terminal / automation / review）
- `consumption user [user_id]`: 指定ユーザーの日次消費。`user_id` 省略時は `/v3/self` の `user_id`（PAT）を使う。service user の self に `user_id` が無い場合は引数必須
- `consumption service-user <id>` / `consumption session <id>`: それぞれの per-ID endpoint。ID は利用者が指定する
- `metrics *`: org metrics 各エンドポイントに対応。**対応はページ名ではなく path で管理する**（例: org 用は `/v3/organizations/{org_id}/metrics/usage`。`organizations-metrics-usage.md` というページ名は enterprise 用 `/v3/enterprise/organizations/{org_id}/metrics/usage` を指すので注意）。`--days N`（既定 30）を `time_after` / `time_before` に変換して渡す
- `--days N`: consumption / metrics / billing 共通。**PST の日境界に揃える**: `time_after` = 「今日（PST）の 0 時」から (N-1) 日前の 0 時、`time_before` = 今日の 0 時。`now - N*86400` のような連続窓だと端数の日が混ざり、ダッシュボードの集計と合わなくなるため
- `date` フィールド（Unix 秒）は表示時に `YYYY-MM-DD`（America/Los_Angeles）へ変換する
- `--org ID`: org scope コマンド共通。省略時は org 解決（下記）

### org 解決（`src/api/resolve-org.ts`）

優先順位:

1. `--org` フラグ
2. `DEVIN_ORG_ID` env
3. config `org_id`
4. `GET /v3/self` の結果:
   - `pat_user` / `windsurf_session`: `primary_billing_org_id` → `devin_sessions_org_id` → `org_id`
   - `service_user` / `devin_brain`: `org_id`

どれも取れなければ exit 2 で「`--org` か `DEVIN_ORG_ID` を指定する」旨を出す。`self` は 1 プロセス 1 回まで（コマンド内で複数回呼ばない）。

### 設定・秘密

- env:
  - `DEVIN_API_KEY` — `cog_` トークン（PAT / service user 共通）
  - `DEVIN_ORG_ID` — org ID（任意。省略時は自動解決）
  - `DEVIN_API_BASE_URL` — 既定 `https://api.devin.ai`（テスト・プロキシ用）
  - `DEVIN_API_TIMEOUT` — API の 1 リクエストあたりの時間切れ秒。既定 20
  - `DEVIN_COMMAND_TIMEOUT` — 設定の `*_command` の時間切れ秒。既定 60
- config: `$XDG_CONFIG_HOME/devin-cli/config.toml`（`XDG_CONFIG_HOME` 無ければ `~/.config/devin-cli/config.toml`）
  - `api_key_command` — `sh -c` で実行し stdout 1 行を秘密として使う（infisical 等。env が優先で command は走らない）
  - `org_id` / `api_base_url` — env のフォールバック
- **`api_key` のような秘密の平文直書きキーは config に持たない**（9router-cli と同じく、秘密は env か `*_command` のみ）
- `--help` の末尾に env と config の一覧を出す（9router-cli と同じ形）
- 秘密は argv にも出力にも載せない

### エラー処理

- **401 Unauthorized → exit 2**（認証情報の誤り。9router-cli が login 失敗を exit 2 にするのと同じ扱い。「`DEVIN_API_KEY` を確認する」旨を添える）
- その他の HTTP エラー (403 / 404 / 422 / 429 / 5xx) → `ProblemDetail` の `detail`（無ければ `title`）と status を stderr に出して **exit 1**。429 はリトライせずそのまま返す
- fetch 失敗・タイムアウト → `CommError` で exit 2
- 必須設定の欠落・引数不正 → exit 2
- 想定外の例外 → `cli.ts` の catch で exit 70

## テスト

- `tests/helpers/fake-devin.ts`: `Bun.serve` でルート→ canned JSON のテーブルを持つ fake サーバ。受けたリクエスト（path/query/header）を記録する
- `tests/helpers/cli.ts`: `bun src/cli.ts` を spawn して stdout/stderr/exit code を取るヘルパー（9router-cli と同じ形）
- 主なケース:
  - `self`: TSV/JSON 出力、401 → exit 2（認証エラー）
  - org 解決: `--org` > env > config > `self` フォールバックの優先順位、全部無い → exit 2。`self` が `pat_user` / `service_user` で優先順位が違うこと
  - `billing`: `total_acus` と `acus_by_product` 合算の正しさ、`--days` → `time_after`/`time_before` が PST 日境界に揃うこと
  - `consumption daily`: TSV の列構成、`date` が `YYYY-MM-DD` 表示になること
  - `consumption user`: 引数あり/省略時（self の user_id 解決）の両方
  - `metrics usage`: path が `/v3/organizations/{org_id}/metrics/usage` であることとパラメータ変換
  - エラー: 403 `ProblemDetail` → exit 1 + detail が stderr、fetch 失敗 → exit 2
  - config.toml の読み込みと `api_key_command`（`echo` を使った疑似コマンド）
- `sync-openapi` のマージ部は純粋関数として小さくテスト（fixture fragment で dedupe / operationId 正規化・重複時の失敗を確認）。fetch 部分は対象外

## リポジトリ構成

```
package.json  tsconfig.json  orval.config.ts  lefthook.yml  .gitignore  README.md
openapi/devin-v3.yaml          # 生成物（コミット）
scripts/sync-openapi.ts        # spec 生成
src/cli.ts                     # commander エントリ
src/version.ts
src/lib.ts                     # ExitError/CommError/guard/config/secret/send/timeout（9router-cli 踏襲）
src/api/mutator.ts             # Orval mutator（send() の薄い層）
src/api/resolve-org.ts         # org 解決
src/commands/self.ts
src/commands/billing.ts
src/commands/consumption.ts
src/commands/metrics.ts
src/generated/                 # Orval 生成物（コミット）
tests/
```

- `package.json` scripts: `start` / `sync:openapi` / `generate` / `typecheck` (tsgo) / `lint` (oxlint) / `format` / `format:check` (oxfmt) / `check` / `test`（bun test）。9router-cli と同じ構成に `sync:openapi` と `generate` を足す
- `lefthook.yml`: pre-commit で `format:check` + `lint` + `typecheck`（9router-cli と同じ）
- `src/generated/` は oxlint / oxfmt の対象外にする（生成物の churn を防ぐ。ignore の設定方法は実装時に確認）
- tsconfig は 9router-cli と同じ strict 系オプション（`noUncheckedIndexedAccess` 等）

## README

- 現状は `bun install && bun run start -- --help` での利用を主に書く（バイナリ配布は issue #1）
- env / config.toml の表、コマンド一覧、必要な権限（`ViewOrgConsumption` / `ViewOrgMetrics`）、Pro plan での注意（enterprise scope は 403、metrics の org 版はプラン対応が未証明）を記載

## リスクと未確定事項

- **Pro plan で org endpoint が通るか未検証**: 実装の初手で PAT を作り `GET /v3/self` → `consumption/daily` と `metrics/usage` を手で叩いて確認する。consumption は「all plans」注記があるが metrics には無いので、metrics が 403 なら権限不足かプラン非対応かを `detail` で判別する
- **PAT に必要な権限**: `ViewOrgConsumption` と `ViewOrgMetrics` を PAT 作成時に付ける（付け忘れると 403 で「Pro 非対応」と誤読しやすい）
- **Orval の mutator の細部**: 生成コードが mutator に渡す URL/option の形は実装時に生成物を読んで確定する
- **`acus_by_product` の null 許容**: `automation` / `review` はデータが無いと `null`。表示では `-` にする
- **billing cycle の概念**: org scope には cycles endpoint が無い（enterprise のみ）ので、「今月分」ではなく「直近 N 日（PST 日境界揃え）」の窓で見せる
- **v3 全エンドポイント収録のトレードオフ**: ユーザーが全エンドポイント生成を選択済み。生成物は機械的だが diff が大きくなる。docs 更新のたびに無関係な diff が出て困るようなら、sync に path 接頭辞フィルタを足す逃げ道を残す
