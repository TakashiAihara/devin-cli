# devin-cli 設計

- 作成日: 2026-11-06
- ステータス: ドラフト（ユーザーレビュー待ち）

## 目的

Devin API v3 を CLI から使えるようにする。最優先は usage / billing / analytics で、契約プランが Pro (self-serve) でも動く organization scope を主対象にする。

## 前提（調査済みの事実）

- API ベース: `https://api.devin.ai/v3`。認証は `Authorization: Bearer cog_...` で、Personal Access Token (PAT) と Service User API Key は同じ形式・同じヘッダで使える
- 各 API ドキュメントページ (`docs.devin.ai/api-reference/v3/**.md`) に、そのエンドポイントの OpenAPI fragment が ````yaml v3-openapi.yaml` フェンスで埋め込まれている。手書きの spec は不要で、スクレイプ＋マージで機械生成できる
- `GET /v3/self` は無権限で呼べ、`principal_type` と org 系 ID (`org_id` / `devin_sessions_org_id` / `primary_billing_org_id`) を返す。org ID の自動検出に使う
- `GET /v3/organizations/{org_id}/consumption/daily` は「all plans, including Teams and self-serve」と明記されており Pro plan で使える見込み。`/v3/enterprise/*` は Enterprise 限定で Pro では 403 になる想定（spec/クライアントには含めるが CLI コマンドは org scope のみ）
- consumption の日境界は PST (UTC-8) の 0 時。クエリは `time_before` / `time_after` の Unix 秒
- 一覧系は cursor pagination (`after` / `first` → `PaginatedResponse` with `end_cursor` / `has_next_page`)
- Pro plan で org endpoint が実際に通るかは PAT を作って `GET /v3/self` → `consumption/daily` を叩くまで確定しない。403 の場合は enterprise 前提部分を削る判断になる

## スコープ

### v1 で作るもの

- OpenAPI spec の生成パイプラインと生成物
- Orval による型付きクライアント（v3 全エンドポイント分）
- CLI コマンド: `self` / `billing` / `consumption` / `metrics`（analytics 系のみ）
- テスト（fake Devin サーバ + bun test）

### スコープ外

- sessions / knowledge / playbooks / secrets 等の書き込み・操作系コマンド（クライアントには生成されるが CLI には出さない。必要になったら追加）
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
src/api/mutator.ts (base URL / Bearer / timeout / ProblemDetail 変換)
        │
        ▼
src/commands/{self,billing,consumption,metrics}.ts
        │
        ▼
src/cli.ts (commander) → bin: devin-cli
```

## OpenAPI spec パイプライン（`scripts/sync-openapi.ts`）

1. `https://docs.devin.ai/_llms/en/api.txt` を取得し、`api-reference/v3/` を含む `.md` URL を収集
2. 各ページを並列（同時 8 本程度）で fetch し、````yaml v3-openapi.yaml` フェンスの中身を抽出。フェンスが無いページは skip
3. `yaml` パッケージでパースし、fragment ごとに `paths` / `components.schemas` / `components.securitySchemes` をマージ
   - `components.schemas` は名前で dedupe。同名で内容が異なる場合は警告を出して先勝ち（同一バックエンド生成なので実際には一致するはず）
   - `$ref` は `#/components/schemas/...` 形式で完結しているため、マージ後もそのまま解決できる
4. `operationId` を正規化: `method` + path セグメントから camelCase を生成（例: `GET /v3/organizations/{org_id}/consumption/daily` → `getOrganizationsOrgIdConsumptionDaily`、`GET /v3/self` → `getSelf`）。重複があれば警告
5. `servers: [{ url: "https://api.devin.ai" }]`、`info`、`security`（bearerAuth）を正規化して `openapi/devin-v3.yaml` に出力。キーはソートして diff を安定させる
6. ページが 1 つも取れなかった場合は非 0 で終了。ネットワーク失敗したページはリトライ 1 回

- 依存: `yaml`（devDependencies）
- `bun run sync:openapi` で再実行可能。ドキュメントに新エンドポイントが追加されたら再実行するだけで spec が追従する

## Orval クライアント

- devDependencies に `orval`（導入時に公開 7 日以上経過した安定版を選ぶ）
- `orval.config.ts`:
  - `input: openapi/devin-v3.yaml`
  - `output.target: src/generated/`、`mode: 'tags-split'`（タグごとにファイル分割。うまくいかなければ `'split'`）
  - `client: 'fetch'`（Bun ネイティブ fetch）
  - `override.mutator: { path: './src/api/mutator.ts', name: 'apiFetch' }`
- 生成物は `src/generated/` にコミット（`bun build --compile` やテストが orval 無しで通るように）
- `src/api/mutator.ts` の責務:
  - 受け取った URL の origin を `apiBaseUrl()` の値に書き換える（spec の server は `https://api.devin.ai` 固定だが、テストやプロキシ用に `DEVIN_API_BASE_URL` / config `api_base_url` で差し替え可能にする）
  - `Authorization: Bearer <DEVIN_API_KEY>` を注入（`secret()` 経由。env → config `api_key_command` の順）
  - `AbortSignal.timeout(apiTimeoutMs())` でタイムアウト
  - `!res.ok` → body を `ProblemDetail` としてパースし、`detail`/`title`/`status` を持つ `ApiError`（`ExitError` 継承、code 1）を throw
  - fetch 自体の失敗・タイムアウト → `CommError`（code 2）
  - 成功時は `res.json()` を返す
- mutator の signature は Orval fetch client の規約 `apiFetch<T>(url: string, options: RequestInit): Promise<T>` に従う（実装時に生成コードと照合して確認）

## CLI

- bin 名: `devin-cli`（公式 `devin` CLI との衝突回避）。`package.json` の `bin` と `src/cli.ts` の shebang は 9router-cli と同じ形
- フレームワーク: commander。`--json` フラグで生 JSON、それ以外は TSV（`cell()` で null → `-`）。exit code は 9router-cli と同じ規約: 0=成功 / 1=相手が否と答えた (HTTP エラー) / 2=使い方・秘密・通信の誤り / 70=想定外
- `src/version.ts` に `VERSION` 定数（`--version` 用。`__BUILD_VERSION__` define によるリリース版埋め込みは issue #1 側で対応）

### コマンド

```
devin-cli self [--json]
devin-cli billing [--days N] [--org ID] [--json]
devin-cli consumption daily|users|service-users|sessions [--days N] [--org ID] [--json]
devin-cli metrics <usage|sessions|prs|searches|dau|wau|mau|active-users> [--days N] [--org ID] [--json]
```

- `self`: `GET /v3/self`。principal_type・名前・各 org ID を出す。認証確認も兼ねる
- `billing`: `consumption/daily` を直近 N 日（既定 30）で取得し、期間合計 ACU・`acus_by_product` の製品別合計・日別内訳を出す。「今の請求状況」を 1 コマンドで見るための顔
- `consumption daily`: 日別 ACU の TSV（date / acus / devin / cascade / terminal / automation / review）
- `consumption users|service-users|sessions`: 対象別の日次消費。cursor pagination を `has_next_page=false` まで自動で辿る（安全上限あり）
- `metrics *`: org metrics 各エンドポイントに対応。`--days N`（既定 30）を `time_after = now - N*86400` / `time_before = now` に変換して渡す。`--days` は billing / consumption / metrics すべてで既定 30 日
- `--org ID`: org scope コマンド共通。省略時は org 解決（下記）

### org 解決（`src/api/resolve-org.ts`）

優先順位:

1. `--org` フラグ
2. `DEVIN_ORG_ID` env
3. config `org_id`
4. `GET /v3/self` の結果: PAT なら `primary_billing_org_id` → `devin_sessions_org_id` → `org_id`、service user なら `org_id`

どれも取れなければ exit 2 で「`--org` か `DEVIN_ORG_ID` を指定する」旨を出す。`self` は 1 プロセス 1 回まで（コマンド内で複数回呼ばない）。

### 設定・秘密

- env:
  - `DEVIN_API_KEY` — `cog_` トークン（PAT / service user 共通）
  - `DEVIN_ORG_ID` — org ID（任意。省略時は自動解決）
  - `DEVIN_API_BASE_URL` — 既定 `https://api.devin.ai`（テスト・プロキシ用）
  - `DEVIN_API_TIMEOUT` — 1 リクエストの時間切れ秒。既定 20
- config: `$XDG_CONFIG_HOME/devin-cli/config.toml`（`XDG_CONFIG_HOME` 無ければ `~/.config/devin-cli/config.toml`）
  - `api_key` — 直接値
  - `api_key_command` — `sh -c` で実行し stdout 1 行を秘密として使う（infisical 等。env が優先で command は走らない）
  - `org_id` / `api_base_url` — env のフォールバック
- `api_timeout` は env のみ（9router-cli の timeout と同じ扱い）
- 秘密は argv にも出力にも載せない

### エラー処理

- HTTP 4xx/5xx: `ProblemDetail` の `detail`（無ければ `title`）と status を stderr に出して exit 1。401 は「`DEVIN_API_KEY` を確認する」旨を添える
- fetch 失敗・タイムアウト: `CommError` で exit 2
- 必須設定の欠落・引数不正: exit 2
- 想定外の例外: `cli.ts` の catch で exit 70

## テスト

- `tests/helpers/fake-devin.ts`: `Bun.serve` でルート→ canned JSON のテーブルを持つ fake サーバ。受けたリクエスト（path/query/header）を記録する
- `tests/helpers/cli.ts`: `bun src/cli.ts` を spawn して stdout/stderr/exit code を取るヘルパー（9router-cli と同じ形）
- 主なケース:
  - `self`: TSV/JSON 出力、401 → exit 1
  - org 解決: `--org` > env > config > `self` フォールバックの優先順位、全部無い → exit 2
  - `billing`: `total_acus` と `acus_by_product` 合算の正しさ、`--days` → `time_after` パラメータ
  - `consumption daily`: TSV の列構成
  - `metrics usage`: エンドポイント対応とパラメータ変換
  - pagination: users が 2 ページに分かれる応答で全件マージされること
  - エラー: 403 `ProblemDetail` → exit 1 + detail が stderr、fetch 失敗 → exit 2
  - config.toml の読み込みと `api_key_command`（`echo` を使った疑似コマンド）
- `sync-openapi` のマージ部は純粋関数として小さくテスト（2 つの fixture fragment で dedupe / operationId 正規化を確認）。fetch 部分は対象外

## リポジトリ構成

```
package.json  tsconfig.json  orval.config.ts  lefthook.yml  .gitignore  README.md
openapi/devin-v3.yaml          # 生成物（コミット）
scripts/sync-openapi.ts        # spec 生成
src/cli.ts                     # commander エントリ
src/version.ts
src/lib.ts                     # ExitError/CommError/guard/config/secret/timeout（9router-cli 踏襲）
src/api/mutator.ts             # Orval mutator
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
- env / config.toml の表、コマンド一覧、Pro plan での注意（enterprise scope は 403）を記載

## リスクと未確定事項

- **Pro plan で org endpoint が通るか未検証**: 実装の初手で PAT を作り `GET /v3/self` → `consumption/daily` を手で叩いて確認する。403 なら consumption/metrics の org 版が使えないため、CLI の analytics 部分は実質使えなくなる（その場合は enterprise 契約か別プランへの移行をユーザーに相談）
- **Orval の fetch mutator の細部**: 生成コードが mutator に渡す URL/option の形は実装時に生成物を読んで確定する。想定と違う場合は mutator の薄い wrapper で吸収する
- **`acus_by_product` の null 許容**: `automation` / `review` はデータが無いと `null`。表示では `-` にする
- **billing cycle の概念**: org scope には cycles endpoint が無い（enterprise のみ）ので、「今月分」ではなく「直近 N 日」の窓で見せる。請求周期での区切りが欲しくなったら enterprise 契約かダッシュボード参照になる
