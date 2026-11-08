#!/usr/bin/env bun
import { Argument, Command, InvalidArgumentError, Option } from "commander";
import { runBilling } from "./commands/billing.ts";
import { runCompletion, SHELLS, type Shell } from "./commands/completion.ts";
import {
  runConsumptionDaily,
  runConsumptionServiceUser,
  runConsumptionSession,
  runConsumptionUser,
} from "./commands/consumption.ts";
import { METRICS, runMetrics, type MetricsName } from "./commands/metrics.ts";
import {
  runIndexingBranchDelete,
  runIndexingDelete,
  runIndexingList,
  runIndexingRepoDelete,
  runIndexingRepoGet,
  runIndexingRepoSet,
  runIndexingSet,
  runRepositoriesList,
} from "./commands/repositories.ts";
import { runSelf } from "./commands/self.ts";
import {
  runCodeScanFindings,
  runCodeScanMetrics,
  runCodeScanProfiles,
  runCodeScanScans,
} from "./commands/code-scans.ts";
import {
  runSnapshotBlueprintContents,
  runSnapshotBlueprintCreate,
  runSnapshotBlueprintDelete,
  runSnapshotBlueprintFileDelete,
  runSnapshotBlueprintFileUpload,
  runSnapshotBlueprintFilesList,
  runSnapshotBlueprintGet,
  runSnapshotBlueprintsList,
  runSnapshotBlueprintUpdate,
  runSnapshotBuildCancel,
  runSnapshotBuildCreate,
  runSnapshotBuildGet,
  runSnapshotBuildLogs,
  runSnapshotBuildPin,
  runSnapshotBuildsList,
  runSnapshotBuildUnpin,
} from "./commands/snapshot.ts";
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

// consumption / metrics とも API 側の上限は 100 日 (実測: 超えると 422)
const MAX_DAYS = 100;
const days = (value: string): number => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_DAYS)
    throw new InvalidArgumentError(`1〜${MAX_DAYS} の整数を指定する`);
  return n;
};

// ページネーションの --limit。上限は設けず 1 以上の整数のみ検査する
const limit = (value: string): number => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new InvalidArgumentError("1 以上の整数を指定する");
  return n;
};

// --position 用。符号は問わず整数のみ検査する
const intValue = (value: string): number => {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new InvalidArgumentError("整数を指定する");
  return n;
};

const daysOption = () =>
  new Option(
    "--days <n>",
    "直近 N 暦日 (今日を含む。consumption は UTC-8、metrics は UTC の日境界)",
  )
    .argParser(days)
    .default(30);
const orgOption = () => new Option("--org <id>", "org ID (省略時は自動解決)");
const jsonOption = () => new Option(JSON_FLAG, JSON_HELP);
const limitOption = () =>
  new Option("--limit <n>", "取得する最大件数 (省略時は全ページ)").argParser(limit);
const filterOption = () => new Option("--filter <name>", "名前の部分一致フィルタ");
// 繰り返し指定できるオプション。argParser の previous に default の [] が渡るので連結する
const branchOption = () =>
  new Option("--branch <name>", "indexing 対象ブランチ (繰り返し指定可)")
    .argParser((value: string, prev: string[]) => [...prev, value])
    .default([]);
// 値域を検査しつつ繰り返し指定できるオプション (--severity 等)
const enumListOption = (flag: string, desc: string, values: string[]) =>
  new Option(flag, desc)
    .argParser((value: string, prev: string[]) => {
      if (!values.includes(value))
        throw new InvalidArgumentError(`Allowed choices are ${values.join(", ")}.`);
      return [...prev, value];
    })
    .default([]);

// code-scans の enum 値域 (api.schemas.ts の union と対応)
const FINDING_SEVERITIES = ["critical", "high", "medium", "low"];
const FINDING_STATUSES = ["open", "dismissed", "resolved"];
const FINDING_PAYOFFS = ["quick_win", "big_fix", "easy_fix", "deprioritize"];
const SCAN_TYPES = [
  "security",
  "performance",
  "db-queries",
  "test-coverage",
  "dead-code",
  "code-quality",
  "cleanup",
  "telemetry",
  "accessibility",
  "compliance",
  "general",
  "migration-docs",
];

// snapshot-setup 用のオプション
const BUILD_STATUSES = ["pending", "running", "succeeded", "failed", "cancelled"];
const BLUEPRINT_SOURCES = ["git", "database"];
const repoNameOption = () => new Option("--repo <name>", "repo 名 (例: org/repo)");
const sourceOption = () =>
  new Option(
    "--source <mode>",
    "blueprint のソース (git は repo の .devin/blueprint.yaml)",
  ).choices(BLUEPRINT_SOURCES);
const contentsOption = () => new Option("--contents <yaml>", "blueprint YAML 本文");
const contentsFileOption = () =>
  new Option("--contents-file <path>", "blueprint YAML をファイルから読む");
const positionOption = () =>
  new Option("--position <n>", "repo-tier blueprint の実行位置").argParser(intValue);
// PATCH の真偽値は「未指定 / true / false」の 3 状態が必要なので値を取るオプションにする
const boolValueOption = (flag: string, desc: string) =>
  new Option(flag, desc).argParser((value: string) => {
    if (value === "true") return true;
    if (value === "false") return false;
    throw new InvalidArgumentError("true か false を指定する");
  });

program
  .command("self")
  .description("GET /v3/self。認証と principal の確認")
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { json?: boolean }) => {
    process.exit(await runSelf({ json: opts.json === true }));
  });

program
  .command("billing")
  .description("直近 N 日の ACU 消費サマリ (合計・製品別・日別)")
  .addOption(daysOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { days: number; org?: string; json?: boolean }) => {
    process.exit(await runBilling({ days: opts.days, org: opts.org, json: opts.json === true }));
  });

const consumption = program
  .command("consumption")
  .description("日次 ACU 消費 (組織・ユーザー・service user・session)");

consumption
  .command("daily")
  .description("組織の日次消費")
  .addOption(daysOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { days: number; org?: string; json?: boolean }) => {
    process.exit(
      await runConsumptionDaily({ days: opts.days, org: opts.org, json: opts.json === true }),
    );
  });

consumption
  .command("user")
  .description("ユーザーの日次消費 (user_id 省略時は self の user_id)")
  .argument("[user_id]", "ユーザー ID")
  .addOption(daysOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (userId: string | undefined, opts: { days: number; org?: string; json?: boolean }) => {
      process.exit(
        await runConsumptionUser({
          userId,
          days: opts.days,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

consumption
  .command("service-user")
  .description("service user の日次消費")
  .argument("<service_user_id>", "service user ID")
  .addOption(daysOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (serviceUserId: string, opts: { days: number; org?: string; json?: boolean }) => {
    process.exit(
      await runConsumptionServiceUser({
        serviceUserId,
        days: opts.days,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

consumption
  .command("session")
  .description("session の日次消費")
  .argument("<session_id>", "session ID")
  .addOption(daysOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (sessionId: string, opts: { days: number; org?: string; json?: boolean }) => {
    process.exit(
      await runConsumptionSession({
        sessionId,
        days: opts.days,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

program
  .command("metrics")
  .description("組織の利用 metrics (usage/sessions/prs/searches/dau/wau/mau/active-users)")
  .addArgument(new Argument("<name>", "metrics 名").choices(METRICS))
  .addOption(daysOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (name: MetricsName, opts: { days: number; org?: string; json?: boolean }) => {
    process.exit(
      await runMetrics({ name, days: opts.days, org: opts.org, json: opts.json === true }),
    );
  });

const repositories = program
  .command("repositories")
  .description("組織のリポジトリと indexing 設定 (org scope)");

repositories
  .command("list")
  .description("組織が使えるリポジトリ一覧 (GET /repositories)")
  .addOption(limitOption())
  .addOption(filterOption())
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (opts: { limit?: number; filter?: string; org?: string; json?: boolean }) => {
    process.exit(
      await runRepositoriesList({
        limit: opts.limit,
        filter: opts.filter,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

const indexing = repositories
  .command("indexing")
  .description("indexing の一括設定 (GET/PUT/DELETE /repositories/indexing)");

indexing
  .command("list")
  .description("indexing 済みリポジトリ一覧")
  .addOption(limitOption())
  .addOption(filterOption())
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (opts: { limit?: number; filter?: string; org?: string; json?: boolean }) => {
    process.exit(
      await runIndexingList({
        limit: opts.limit,
        filter: opts.filter,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

indexing
  .command("set")
  .description("リポジトリを一括で indexing 対象にする (indexing job が走る)")
  .argument("<paths...>", "repository_path (例: org/repo)")
  .addOption(branchOption())
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (paths: string[], opts: { branch: string[]; org?: string; json?: boolean }) => {
    process.exit(
      await runIndexingSet({
        paths,
        branches: opts.branch,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

indexing
  .command("delete")
  .description("リポジトリを一括で indexing 対象から外す")
  .argument("<paths...>", "repository_path (例: org/repo)")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (paths: string[], opts: { org?: string; json?: boolean }) => {
    process.exit(await runIndexingDelete({ paths, org: opts.org, json: opts.json === true }));
  });

const indexingRepo = repositories
  .command("indexing-repo")
  .description("リポジトリ別の indexing 設定 (GET/PUT/DELETE /repositories/{path}/indexing)");

indexingRepo
  .command("get")
  .description("リポジトリの indexing 状態を取得")
  .argument("<path>", "repository_path (例: org/repo)")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (path: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runIndexingRepoGet({ path, org: opts.org, json: opts.json === true }));
  });

indexingRepo
  .command("set")
  .description("リポジトリを indexing 対象にする (indexing job が走る)")
  .argument("<path>", "repository_path (例: org/repo)")
  .addOption(branchOption())
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (path: string, opts: { branch: string[]; org?: string; json?: boolean }) => {
    process.exit(
      await runIndexingRepoSet({
        path,
        branches: opts.branch,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

indexingRepo
  .command("delete")
  .description("リポジトリを indexing 対象から外す")
  .argument("<path>", "repository_path (例: org/repo)")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (path: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runIndexingRepoDelete({ path, org: opts.org, json: opts.json === true }));
  });

repositories
  .command("indexing-branch")
  .description("ブランチ別の indexing 設定")
  .command("delete")
  .description("ブランチを indexing 対象から外す (DELETE .../indexing/branches/{branch})")
  .argument("<path>", "repository_path (例: org/repo)")
  .argument("<branch>", "ブランチ名")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (path: string, branch: string, opts: { org?: string; json?: boolean }) => {
    process.exit(
      await runIndexingBranchDelete({ path, branch, org: opts.org, json: opts.json === true }),
    );
  });

const codeScans = program
  .command("code-scans")
  .description("code scan の findings / metrics / scans / profiles (read のみ)");

codeScans
  .command("findings")
  .description("code scan findings 一覧 (GET /code-scans/findings)")
  .addOption(limitOption())
  .addOption(new Option("--repo <name>", "このリポジトリの findings に絞る"))
  .addOption(new Option("--scan <id>", "この scan が出した findings に絞る"))
  .addOption(new Option("--q <text>", "title/description/file path のテキスト検索"))
  .addOption(enumListOption("--severity <s>", "severity で絞る (繰り返し可)", FINDING_SEVERITIES))
  .addOption(enumListOption("--status <s>", "status で絞る (繰り返し可)", FINDING_STATUSES))
  .addOption(enumListOption("--payoff <p>", "payoff で絞る (繰り返し可)", FINDING_PAYOFFS))
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(
    async (opts: {
      limit?: number;
      repo?: string;
      scan?: string;
      q?: string;
      severity: string[];
      status: string[];
      payoff: string[];
      org?: string;
      json?: boolean;
    }) => {
      process.exit(
        await runCodeScanFindings({
          limit: opts.limit,
          repo: opts.repo,
          scan: opts.scan,
          q: opts.q,
          severity: opts.severity,
          status: opts.status,
          payoff: opts.payoff,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

codeScans
  .command("metrics")
  .description("code scan の集計 metrics (GET /code-scans/metrics。time 範囲は必須)")
  .addOption(daysOption())
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (opts: { days: number; org?: string; json?: boolean }) => {
    process.exit(
      await runCodeScanMetrics({ days: opts.days, org: opts.org, json: opts.json === true }),
    );
  });

codeScans
  .command("scans")
  .description("code scan 一覧 (GET /code-scans/scans)")
  .addOption(limitOption())
  .addOption(new Option("--repo <name>", "このリポジトリを scan したものに絞る"))
  .addOption(new Option("--type <name>", "scan type で絞る").choices(SCAN_TYPES))
  .addOption(
    new Option("--days <n>", "作成日時が直近 N 暦日のものに絞る (省略時は全期間)").argParser(days),
  )
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(
    async (opts: {
      limit?: number;
      repo?: string;
      type?: string;
      days?: number;
      org?: string;
      json?: boolean;
    }) => {
      process.exit(
        await runCodeScanScans({
          limit: opts.limit,
          repo: opts.repo,
          type: opts.type,
          days: opts.days,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

codeScans
  .command("profiles")
  .description("code scan profile 一覧 / 詳細 (GET /code-scans/profiles[/{id}])")
  .argument("[profile_id]", "profile ID (省略時は一覧)")
  .addOption(limitOption())
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(
    async (
      profileId: string | undefined,
      opts: { limit?: number; org?: string; json?: boolean },
    ) => {
      process.exit(
        await runCodeScanProfiles({
          profileId,
          limit: opts.limit,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

const snapshot = program
  .command("snapshot")
  .description("snapshot-setup の blueprints / builds (org scope)");

const blueprints = snapshot
  .command("blueprints")
  .description("snapshot blueprint の CRUD (GET/POST/PATCH/DELETE /snapshot-setup/blueprints)");

blueprints
  .command("list")
  .description("blueprint 一覧")
  .addOption(repoNameOption())
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (opts: { repo?: string; org?: string; json?: boolean }) => {
    process.exit(
      await runSnapshotBlueprintsList({ repo: opts.repo, org: opts.org, json: opts.json === true }),
    );
  });

blueprints
  .command("get")
  .description("blueprint 詳細")
  .argument("<id>", "blueprint ID")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (id: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSnapshotBlueprintGet({ id, org: opts.org, json: opts.json === true }));
  });

blueprints
  .command("create")
  .description("blueprint を作成 (build は自動では走らない)")
  .addOption(repoNameOption())
  .addOption(sourceOption())
  .addOption(contentsOption())
  .addOption(contentsFileOption())
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(
    async (opts: {
      repo?: string;
      source?: string;
      contents?: string;
      contentsFile?: string;
      org?: string;
      json?: boolean;
    }) => {
      process.exit(
        await runSnapshotBlueprintCreate({
          repo: opts.repo,
          source: opts.source,
          contents: opts.contents,
          contentsFile: opts.contentsFile,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

blueprints
  .command("update")
  .description("blueprint を部分更新 (PATCH。build は自動では走らない)")
  .argument("<id>", "blueprint ID")
  .addOption(contentsOption())
  .addOption(contentsFileOption())
  .addOption(positionOption())
  .addOption(sourceOption())
  .addOption(boolValueOption("--build-on-default-branch <bool>", "push ごとの build を on/off"))
  .addOption(boolValueOption("--report-check-runs <bool>", "commit build の check run を on/off"))
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(
    async (
      id: string,
      opts: {
        contents?: string;
        contentsFile?: string;
        position?: number;
        source?: string;
        buildOnDefaultBranch?: boolean;
        reportCheckRuns?: boolean;
        org?: string;
        json?: boolean;
      },
    ) => {
      process.exit(
        await runSnapshotBlueprintUpdate({
          id,
          contents: opts.contents,
          contentsFile: opts.contentsFile,
          position: opts.position,
          source: opts.source,
          buildOnDefaultBranch: opts.buildOnDefaultBranch,
          reportCheckRuns: opts.reportCheckRuns,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

blueprints
  .command("delete")
  .description("blueprint を soft-delete")
  .argument("<id>", "blueprint ID")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (id: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSnapshotBlueprintDelete({ id, org: opts.org, json: opts.json === true }));
  });

blueprints
  .command("contents")
  .description("blueprint YAML の presigned URL を取得")
  .argument("<id>", "blueprint ID")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (id: string, opts: { org?: string; json?: boolean }) => {
    process.exit(
      await runSnapshotBlueprintContents({ id, org: opts.org, json: opts.json === true }),
    );
  });

const blueprintFiles = blueprints
  .command("files")
  .description("blueprint file (env-var 置換素材) の一覧/アップロード/削除");

blueprintFiles
  .command("list")
  .description("blueprint file 一覧")
  .argument("<blueprint_id>", "blueprint ID")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (blueprintId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(
      await runSnapshotBlueprintFilesList({
        blueprintId,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

blueprintFiles
  .command("upload")
  .description("blueprint file をアップロード (multipart)")
  .argument("<blueprint_id>", "blueprint ID")
  .argument("<file_path>", "アップロードするファイルのパス")
  .requiredOption("--name <name>", "file の名前")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(
    async (
      blueprintId: string,
      filePath: string,
      opts: { name: string; org?: string; json?: boolean },
    ) => {
      process.exit(
        await runSnapshotBlueprintFileUpload({
          blueprintId,
          filePath,
          name: opts.name,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

blueprintFiles
  .command("delete")
  .description("blueprint file を削除")
  .argument("<blueprint_id>", "blueprint ID")
  .argument("<file_id>", "file ID")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (blueprintId: string, fileId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(
      await runSnapshotBlueprintFileDelete({
        blueprintId,
        fileId,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

const builds = snapshot
  .command("builds")
  .description("snapshot build の一覧/詳細/操作 (GET/POST /snapshot-setup/builds)");

builds
  .command("list")
  .description("build 一覧")
  .addOption(limitOption())
  .addOption(new Option("--status <s>", "status で絞る").choices(BUILD_STATUSES))
  .addOption(new Option("--active", "現在 session が使っている build のみ"))
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(
    async (opts: {
      limit?: number;
      status?: string;
      active?: boolean;
      org?: string;
      json?: boolean;
    }) => {
      process.exit(
        await runSnapshotBuildsList({
          limit: opts.limit,
          status: opts.status,
          active: opts.active,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

builds
  .command("get")
  .description("build 詳細")
  .argument("<id>", "build ID")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (id: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSnapshotBuildGet({ id, org: opts.org, json: opts.json === true }));
  });

builds
  .command("create")
  .description("snapshot build を手動で起動 (計算リソースを消費する可能性あり。--yes 必須)")
  .option("--yes", "実行を確認した")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (opts: { yes?: boolean; org?: string; json?: boolean }) => {
    process.exit(
      await runSnapshotBuildCreate({
        yes: opts.yes === true,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

builds
  .command("logs")
  .description("build ログの presigned URL を取得")
  .argument("<id>", "build ID")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (id: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSnapshotBuildLogs({ id, org: opts.org, json: opts.json === true }));
  });

builds
  .command("cancel")
  .description("進行中の build をキャンセル")
  .argument("<id>", "build ID")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (id: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSnapshotBuildCancel({ id, org: opts.org, json: opts.json === true }));
  });

builds
  .command("pin")
  .description("成功した build を pin (7 日以内)")
  .argument("<id>", "build ID")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (id: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSnapshotBuildPin({ id, org: opts.org, json: opts.json === true }));
  });

builds
  .command("unpin")
  .description("build の pin を外す (その build に pin されている場合のみ)")
  .argument("<id>", "build ID")
  .addOption(orgOption())
  .addOption(jsonOption())
  .action(async (id: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSnapshotBuildUnpin({ id, org: opts.org, json: opts.json === true }));
  });

program
  .command("completion")
  .description("シェル補完スクリプトを stdout に出す")
  .addArgument(new Argument("<shell>", "bash / zsh / fish").choices(SHELLS))
  .action(async (shell: Shell) => {
    process.exit(await runCompletion({ shell }));
  });

// 1 は相手が否と答えた、2 は使い方・秘密・通信の誤り、70 は想定外の内部エラー
program.parseAsync().catch((e: unknown) => {
  process.stderr.write(`error: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(70);
});
