#!/usr/bin/env bun
import { Argument, Command, InvalidArgumentError, Option } from "commander";
import {
  SessionCreateRequestDevinMode,
  SessionResponseOrigin,
  SessionResponseStatus,
} from "./generated/api.schemas.ts";
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
  runSessionsArchive,
  runSessionsAttachments,
  runSessionsCreate,
  runSessionsDelete,
  runSessionsGet,
  runSessionsInsights,
  runSessionsList,
  runSessionsMessages,
  runSessionsTagsAdd,
  runSessionsTagsGet,
  runSessionsTagsSet,
  type SessionCreateOptions,
  type SessionFilterOptions,
} from "./commands/sessions.ts";
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

// consumption / metrics とも API 側の上限は 100 日 (実測: 超えると 422)
const MAX_DAYS = 100;
const days = (value: string): number => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_DAYS)
    throw new InvalidArgumentError(`1〜${MAX_DAYS} の整数を指定する`);
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

// ---- sessions ----
// 一覧・insights のページサイズは API 上限の 200 を内部で使い、--limit は出力件数を絞る
const positiveInt = (value: string): number => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new InvalidArgumentError("1 以上の整数を指定する");
  return n;
};

// 期間フィルタは Unix 秒か ISO 8601 (例: 2026-01-01) を受ける
const unixTime = (value: string): number => {
  if (/^\d+$/.test(value)) return Number(value);
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new InvalidArgumentError(`Unix 秒か ISO 8601 で指定する: ${value}`);
  return Math.floor(ms / 1000);
};

// 繰り返し指定できるオプション用。--tag a --tag b で ["a","b"] に貯める
const collect =
  <T>(parse: (v: string) => T) =>
  (v: string, prev: T[] = []): T[] => [...prev, parse(v)];

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (v: string): T => {
    if (!values.includes(v as T))
      throw new InvalidArgumentError(`選べるのは ${values.join(", ")}: ${v}`);
    return v as T;
  };

const SESSION_STATUSES = Object.values(SessionResponseStatus);
const SESSION_ORIGINS = Object.values(SessionResponseOrigin);
const DEVIN_MODES = Object.values(SessionCreateRequestDevinMode);

const repeatable = <T>(flags: string, desc: string, parse: (v: string) => T) =>
  new Option(flags, desc).argParser(collect(parse)).default([] as T[]);

const limitOption = () =>
  new Option("--limit <n>", "出力する最大件数 (省略時は全件)").argParser(positiveInt);

// list / insights で共通のオプション群 (フィルタは API の SessionsQueryParams に対応。
// --status は API に無いのでクライアント側で絞る)
const addSessionListOptions = (cmd: Command) => {
  cmd
    .addOption(limitOption())
    .addOption(
      repeatable("--status <status>", "status で絞る (繰り返し可)", oneOf(SESSION_STATUSES)),
    )
    .addOption(new Option("--archived", "is_archived=true のみ").conflicts("active"))
    .addOption(new Option("--active", "is_archived=false のみ"))
    .addOption(repeatable("--tag <tag>", "タグで絞る (繰り返し可)", (v) => v))
    .addOption(
      repeatable("--origin <origin>", "origin で絞る (繰り返し可)", oneOf(SESSION_ORIGINS)),
    )
    .addOption(repeatable("--user <user_id>", "作成ユーザーで絞る (繰り返し可)", (v) => v))
    .addOption(repeatable("--repo <owner/repo>", "リポジトリで絞る (繰り返し可)", (v) => v))
    .addOption(
      new Option("--created-after <t>", "作成日時の下限 (Unix 秒か ISO 8601)").argParser(unixTime),
    )
    .addOption(
      new Option("--created-before <t>", "作成日時の上限 (Unix 秒か ISO 8601)").argParser(unixTime),
    )
    .addOption(
      new Option("--updated-after <t>", "更新日時の下限 (Unix 秒か ISO 8601)").argParser(unixTime),
    )
    .addOption(
      new Option("--updated-before <t>", "更新日時の上限 (Unix 秒か ISO 8601)").argParser(unixTime),
    )
    .addOption(orgOption())
    .option(JSON_FLAG, JSON_HELP);
};

// commander の opts (camelCase) を SessionFilterOptions に写す
const filterOpts = (opts: Record<string, unknown>): SessionFilterOptions => ({
  limit: opts.limit as number | undefined,
  status: opts.status as string[] | undefined,
  archived: opts.archived as boolean | undefined,
  active: opts.active as boolean | undefined,
  tags: opts.tag as string[] | undefined,
  origins: opts.origin as string[] | undefined,
  userIds: opts.user as string[] | undefined,
  repoNames: opts.repo as string[] | undefined,
  createdAfter: opts.createdAfter as number | undefined,
  createdBefore: opts.createdBefore as number | undefined,
  updatedAfter: opts.updatedAfter as number | undefined,
  updatedBefore: opts.updatedBefore as number | undefined,
  org: opts.org as string | undefined,
  json: opts.json === true,
});

const sessions = program
  .command("sessions")
  .description("Devin セッション (一覧・詳細・メッセージ・insights・作成・archive・タグ・削除)");

const sessionsListCmd = sessions
  .command("list")
  .description("セッション一覧 (cursor ページネーション。--limit で打ち切り)")
  .action(async (opts: Record<string, unknown>) => {
    process.exit(await runSessionsList(filterOpts(opts)));
  });
addSessionListOptions(sessionsListCmd);

sessions
  .command("get")
  .description("セッション詳細")
  .argument("<devin_id>", "session ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (devinId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSessionsGet({ devinId, org: opts.org, json: opts.json === true }));
  });

sessions
  .command("messages")
  .description("セッションのメッセージ一覧 (時系列)")
  .argument("<devin_id>", "session ID")
  .addOption(limitOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (devinId: string, opts: { limit?: number; org?: string; json?: boolean }) => {
    process.exit(
      await runSessionsMessages({
        devinId,
        limit: opts.limit,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

const sessionsInsightsCmd = sessions
  .command("insights")
  .description("セッションの insights。ID 省略時は組織全体の一覧")
  .argument("[devin_id]", "session ID (省略時は組織全体)")
  .action(async (devinId: string | undefined, opts: Record<string, unknown>) => {
    process.exit(await runSessionsInsights({ ...filterOpts(opts), devinId }));
  });
addSessionListOptions(sessionsInsightsCmd);

sessions
  .command("attachments")
  .description("セッションの添付一覧")
  .argument("<devin_id>", "session ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (devinId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(
      await runSessionsAttachments({ devinId, org: opts.org, json: opts.json === true }),
    );
  });

sessions
  .command("create")
  .description("セッションを作成する (実費が発生する)")
  .addHelpText("after", "\n--prompt - で stdin からプロンプトを読む。作成には ACU 課金が発生する")
  .requiredOption("--prompt <text>", "プロンプト ('-' で stdin)")
  .option("--title <title>", "タイトル")
  .option(
    "--repo <owner/repo>",
    "対象リポジトリ (繰り返し可)",
    collect((v) => v),
    [],
  )
  .option(
    "--tag <tag>",
    "タグ (繰り返し可)",
    collect((v) => v),
    [],
  )
  .option("--playbook-id <id>", "playbook ID")
  .option(
    "--attachment <url>",
    "添付 URL (繰り返し可)",
    collect((v) => v),
    [],
  )
  .addOption(new Option("--mode <mode>", "Devin モード").choices(DEVIN_MODES))
  .option("--max-acu <n>", "ACU 上限", positiveInt)
  .option("--platform <name>", "VM platform / outpost pool 名")
  .option("--bypass-approval", "safe mode の承認をバイパスする")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (opts: {
      prompt: string;
      title?: string;
      repo?: string[];
      tag?: string[];
      playbookId?: string;
      attachment?: string[];
      mode?: string;
      maxAcu?: number;
      platform?: string;
      bypassApproval?: boolean;
      org?: string;
      json?: boolean;
    }) => {
      const body: SessionCreateOptions = {
        prompt: opts.prompt,
        title: opts.title,
        repos: opts.repo,
        tags: opts.tag,
        playbookId: opts.playbookId,
        attachmentUrls: opts.attachment,
        devinMode: opts.mode,
        maxAcuLimit: opts.maxAcu,
        platform: opts.platform,
        bypassApproval: opts.bypassApproval,
        org: opts.org,
        json: opts.json === true,
      };
      process.exit(await runSessionsCreate(body));
    },
  );

sessions
  .command("archive")
  .description("セッションを archive する (実行中なら sleep させる)")
  .argument("<devin_id>", "session ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (devinId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSessionsArchive({ devinId, org: opts.org, json: opts.json === true }));
  });

// tags は get/add/set のサブコマンドだけを持つグループにする。
// グループ自身に --org/--json 等を持たせると、commander がサブコマンド名より先に
// 親のオプションとして食べてしまい、add/set に --org が届かない (実測で確認)
const sessionsTagsCmd = sessions
  .command("tags")
  .description("セッションのタグ (get で一覧・add で追加・set で全置換)");

sessionsTagsCmd
  .command("get")
  .description("タグ一覧")
  .argument("<devin_id>", "session ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (devinId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runSessionsTagsGet({ devinId, org: opts.org, json: opts.json === true }));
  });

sessionsTagsCmd
  .command("add")
  .description("タグを追加する (既存タグと重複しない)")
  .argument("<devin_id>", "session ID")
  .argument("<tag...>", "タグ (1つ以上)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (devinId: string, tag: string[], opts: { org?: string; json?: boolean }) => {
    process.exit(
      await runSessionsTagsAdd({ devinId, tags: tag, org: opts.org, json: opts.json === true }),
    );
  });

sessionsTagsCmd
  .command("set")
  .description("タグを全置換する (引数なしで全タグ削除)")
  .argument("<devin_id>", "session ID")
  .argument("[tag...]", "タグ (省略時は空 = 全削除)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (devinId: string, tag: string[] | undefined, opts: { org?: string; json?: boolean }) => {
      process.exit(
        await runSessionsTagsSet({
          devinId,
          tags: tag ?? [],
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

sessions
  .command("delete")
  .description("セッションを終了する (破壊的。--yes 必須)")
  .argument("<devin_id>", "session ID")
  .option("--yes", "実際に DELETE を実行する (無いと dry-run で exit 2)")
  .option("--archive", "削除と同時に archive する")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (
      devinId: string,
      opts: { yes?: boolean; archive?: boolean; org?: string; json?: boolean },
    ) => {
      process.exit(
        await runSessionsDelete({
          devinId,
          yes: opts.yes,
          archive: opts.archive,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

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
