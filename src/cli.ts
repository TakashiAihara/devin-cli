#!/usr/bin/env bun
import { Argument, Command, InvalidArgumentError, Option } from "commander";
import { runAttachmentDownload, runAttachmentUpload } from "./commands/attachments.ts";
import { runBilling } from "./commands/billing.ts";
import { runCompletion, SHELLS, type Shell } from "./commands/completion.ts";
import {
  runConsumptionDaily,
  runConsumptionServiceUser,
  runConsumptionSession,
  runConsumptionUser,
} from "./commands/consumption.ts";
import { runDefaultPlatformGet, runDefaultPlatformSet } from "./commands/default-platform.ts";
import { METRICS, runMetrics, type MetricsName } from "./commands/metrics.ts";
import { runMembersGet, runMembersIdpUsers, runMembersList } from "./commands/members.ts";
import {
  runPlaybookCreate,
  runPlaybookDelete,
  runPlaybookGet,
  runPlaybookUpdate,
  runPlaybooksList,
  type PlaybookWriteOptions,
} from "./commands/playbooks.ts";
import { runPrReviewCreate, runPrReviewGet } from "./commands/pr-reviews.ts";
import {
  runSecurityProfileCreate,
  runSecurityProfileDelete,
  runSecurityProfileGet,
  runSecurityProfileUpdate,
  runSecurityProfilesList,
  type SecurityProfileWriteOptions,
} from "./commands/security-profiles.ts";
import {
  runSecurityProfileSettingsGet,
  runSecurityProfileSettingsUpdate,
} from "./commands/security-profile-settings.ts";
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

// 一覧系の cursor pagination。--limit は取る件数の上限 (省略時は全ページ)
const positiveInt = (value: string): number => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new InvalidArgumentError("1 以上の整数を指定する");
  return n;
};
const limitOption = () =>
  new Option("--limit <n>", "取得する最大件数 (省略時は全ページ)").argParser(positiveInt);
const boolValue = (value: string): boolean => {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new InvalidArgumentError("true か false を指定する");
};
const collect = (value: string, previous: string[]) => [...previous, value];

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

program
  .command("completion")
  .description("シェル補完スクリプトを stdout に出す")
  .addArgument(new Argument("<shell>", "bash / zsh / fish").choices(SHELLS))
  .action(async (shell: Shell) => {
    process.exit(await runCompletion({ shell }));
  });

// --- members (v3beta1) ---
const members = program
  .command("members")
  .description("org メンバー (v3beta1。list/get/idp-users)");

members
  .command("list")
  .description("メンバー一覧 (cursor pagination)")
  .addOption(limitOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { limit?: number; org?: string; json?: boolean }) => {
    process.exit(
      await runMembersList({ limit: opts.limit, org: opts.org, json: opts.json === true }),
    );
  });

members
  .command("get")
  .description("メンバー詳細 (直接 + IDP 由来の role を返す)")
  .argument("<user_id>", "ユーザー ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (userId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runMembersGet({ userId, org: opts.org, json: opts.json === true }));
  });

members
  .command("idp-users")
  .description("IDP グループ由来のメンバー一覧")
  .addOption(limitOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { limit?: number; org?: string; json?: boolean }) => {
    process.exit(
      await runMembersIdpUsers({ limit: opts.limit, org: opts.org, json: opts.json === true }),
    );
  });

// --- playbooks ---
const playbooks = program.command("playbooks").description("org の playbook CRUD");

playbooks
  .command("list")
  .description("playbook 一覧 (cursor pagination)")
  .addOption(limitOption())
  .option("--include-enterprise", "enterprise 共通の playbook も含める")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (opts: { limit?: number; includeEnterprise?: boolean; org?: string; json?: boolean }) => {
      process.exit(
        await runPlaybooksList({
          limit: opts.limit,
          includeEnterprise: opts.includeEnterprise,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

playbooks
  .command("get")
  .description("playbook 詳細")
  .argument("<playbook_id>", "playbook ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (playbookId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runPlaybookGet({ playbookId, org: opts.org, json: opts.json === true }));
  });

// create / update は同じ項目を取る (PUT は全項目置き換えなので title/body は両方必須。
// 必須判定は writeBody が exit 2 で行う)
const playbookWriteOptions = (cmd: Command) =>
  cmd
    .option("--title <title>", "playbook のタイトル")
    .option("--body <text>", "playbook の本文 (--body-file と排他)")
    .option("--body-file <path>", 'playbook の本文をファイルから読む ("-" で stdin)')
    .option("--macro <macro>", "playbook macro (! で始まる識別子)")
    .option("--structured-output-schema <json>", "structured output の JSON Schema")
    .addOption(orgOption())
    .option(JSON_FLAG, JSON_HELP);

playbookWriteOptions(
  playbooks.command("create").description("playbook を作成 (--title/--body 必須)"),
).action(async (opts: PlaybookWriteOptions) => {
  process.exit(await runPlaybookCreate({ ...opts, json: opts.json === true }));
});

playbookWriteOptions(
  playbooks
    .command("update")
    .description("playbook を更新 (PUT。title/body は全項目置き換えなので必須)")
    .argument("<playbook_id>", "playbook ID"),
).action(async (playbookId: string, opts: PlaybookWriteOptions) => {
  process.exit(await runPlaybookUpdate({ ...opts, playbookId, json: opts.json === true }));
});

playbooks
  .command("delete")
  .description("playbook を削除")
  .argument("<playbook_id>", "playbook ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (playbookId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runPlaybookDelete({ playbookId, org: opts.org, json: opts.json === true }));
  });

// --- pr-reviews ---
const prReviews = program
  .command("pr-reviews")
  .description("PR review の起動・参照 (一覧 API は無く PR 単位)");

prReviews
  .command("get")
  .description("PR の最新 review を取得 (pr_url 必須)")
  .argument("<pr_url>", "PR の URL (例: https://github.com/owner/repo/pull/123)")
  .option("--commit-sha <sha>", "commit SHA (省略時は PR の head)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (prUrl: string, opts: { commitSha?: string; org?: string; json?: boolean }) => {
    process.exit(
      await runPrReviewGet({
        prUrl,
        commitSha: opts.commitSha,
        org: opts.org,
        json: opts.json === true,
      }),
    );
  });

prReviews
  .command("create")
  .description("PR の review を起動")
  .argument("<pr_url>", "PR の URL")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (prUrl: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runPrReviewCreate({ prUrl, org: opts.org, json: opts.json === true }));
  });

// --- attachments ---
const attachments = program
  .command("attachments")
  .description("org attachments の upload/download");

attachments
  .command("upload")
  .description("ファイルを attachment としてアップロード (multipart)")
  .argument("<file>", "アップロードするファイル")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (file: string, opts: { org?: string; json?: boolean }) => {
    process.exit(await runAttachmentUpload({ file, org: opts.org, json: opts.json === true }));
  });

attachments
  .command("download")
  .description("attachment をダウンロード (--out 省略時はバイナリを stdout に出す)")
  .argument("<uuid>", "attachment の uuid")
  .argument("<name>", "attachment の name")
  .option("--out <file>", "保存先ファイル")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (uuid: string, name: string, opts: { out?: string; org?: string; json?: boolean }) => {
      process.exit(
        await runAttachmentDownload({
          uuid,
          name,
          out: opts.out,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

// --- security-profiles (v3beta1) ---
const securityProfiles = program
  .command("security-profiles")
  .description("org の security profile CRUD (v3beta1)");

securityProfiles
  .command("list")
  .description("security profile 一覧 (cursor pagination)")
  .addOption(limitOption())
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { limit?: number; org?: string; json?: boolean }) => {
    process.exit(
      await runSecurityProfilesList({ limit: opts.limit, org: opts.org, json: opts.json === true }),
    );
  });

securityProfiles
  .command("get")
  .description("security profile 詳細")
  .argument("<profile_id>", "profile ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (profileId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(
      await runSecurityProfileGet({ profileId, org: opts.org, json: opts.json === true }),
    );
  });

// create / update で共通の項目フラグ。update は指定した項目だけを PATCH する
const profileFieldOptions = (cmd: Command) =>
  cmd
    .option("--name <name>", "profile 名")
    .addOption(
      new Option("--enforcement-level <level>", "enforcement").choices([
        "recommended",
        "mandatory",
      ]),
    )
    .addOption(
      new Option("--git-access-level <level>", "git access").choices(["read_only", "read_write"]),
    )
    .option("--devin-mcp-read-only <bool>", "read-only Devin MCP tools のみ許可", boolValue)
    .option("--remove-github-cli-token <bool>", "GitHub CLI token を session から除く", boolValue)
    .option("--mcp-server <slug>", "許可する MCP server の slug (繰り返し可)", collect, [])
    .option("--clear-mcp-config", "mcp_config を解除 (update のみ意味を持つ)")
    .option("--net-policy-json <json>", "net_policy を JSON object か null で指定")
    .option("--slack-channel-access-json <json>", "slack_channel_access を JSON で指定")
    .option("--teams-channel-access-json <json>", "teams_channel_access を JSON で指定")
    .addOption(
      new Option("--slack-dm-scope <scope>", "Slack DM scope (update では null で解除)").choices([
        "disabled",
        "org_members",
        "workspace",
        "null",
      ]),
    )
    .addOption(
      new Option("--teams-dm-scope <scope>", "Teams DM scope (update では null で解除)").choices([
        "disabled",
        "installed_users",
        "null",
      ]),
    )
    .addOption(
      new Option(
        "--teams-group-chat-scope <scope>",
        "Teams group chat scope (update では null で解除)",
      ).choices(["disabled", "origin_chat", "null"]),
    );

// create は --name 必須 (runSecurityProfileCreate が exit 2 で検査)。
// update は指定した項目だけを PATCH する
profileFieldOptions(
  securityProfiles.command("create").description("security profile を作成 (--name 必須)"),
)
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: SecurityProfileWriteOptions) => {
    process.exit(await runSecurityProfileCreate({ ...opts, json: opts.json === true }));
  });

profileFieldOptions(
  securityProfiles
    .command("update")
    .description("security profile を更新 (PATCH。指定した項目だけ送る)")
    .argument("<profile_id>", "profile ID"),
)
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (profileId: string, opts: SecurityProfileWriteOptions) => {
    process.exit(await runSecurityProfileUpdate({ ...opts, profileId, json: opts.json === true }));
  });

securityProfiles
  .command("delete")
  .description("security profile を削除")
  .argument("<profile_id>", "profile ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (profileId: string, opts: { org?: string; json?: boolean }) => {
    process.exit(
      await runSecurityProfileDelete({ profileId, org: opts.org, json: opts.json === true }),
    );
  });

// --- security-profile-settings (v3beta1) ---
const securityProfileSettings = program
  .command("security-profile-settings")
  .description("org の security profile 既定値 (v3beta1)");

securityProfileSettings
  .command("get")
  .description("default / automations_default の現在値")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { org?: string; json?: boolean }) => {
    process.exit(await runSecurityProfileSettingsGet({ org: opts.org, json: opts.json === true }));
  });

securityProfileSettings
  .command("update")
  .description("default / automations_default を更新 (PATCH。省略した側は変更しない)")
  .addOption(
    new Option("--default <selection>", "default の selection").choices([
      "inherit",
      "none",
      "profile",
    ]),
  )
  .option("--default-profile <id>", "--default profile のときの profile ID")
  .addOption(
    new Option("--automations-default <selection>", "automations_default の selection").choices([
      "inherit",
      "none",
      "profile",
    ]),
  )
  .option("--automations-default-profile <id>", "--automations-default profile の profile ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (opts: {
      default?: string;
      defaultProfile?: string;
      automationsDefault?: string;
      automationsDefaultProfile?: string;
      org?: string;
      json?: boolean;
    }) => {
      process.exit(
        await runSecurityProfileSettingsUpdate({
          default: opts.default,
          defaultProfile: opts.defaultProfile,
          automationsDefault: opts.automationsDefault,
          automationsDefaultProfile: opts.automationsDefaultProfile,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

// --- default-platform (v3beta1) ---
const defaultPlatform = program
  .command("default-platform")
  .description("新規 session の既定 platform (v3beta1)");

defaultPlatform
  .command("get")
  .description("現在の既定 platform")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (opts: { org?: string; json?: boolean }) => {
    process.exit(await runDefaultPlatformGet({ org: opts.org, json: opts.json === true }));
  });

defaultPlatform
  .command("set")
  .description("既定 platform を設定 (--clear で解除)")
  .option("--platform <label>", "hosted platform ラベル (例: linux) か outpost pool 名")
  .option("--outpost-pool-id <id>", "共有 outpost pool の ID")
  .option("--clear", "既定を解除 (platform/outpost_pool_id を両方 null に)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(
    async (opts: {
      platform?: string;
      outpostPoolId?: string;
      clear?: boolean;
      org?: string;
      json?: boolean;
    }) => {
      process.exit(
        await runDefaultPlatformSet({
          platform: opts.platform,
          outpostPoolId: opts.outpostPoolId,
          clear: opts.clear,
          org: opts.org,
          json: opts.json === true,
        }),
      );
    },
  );

// 1 は相手が否と答えた、2 は使い方・秘密・通信の誤り、70 は想定外の内部エラー
program.parseAsync().catch((e: unknown) => {
  process.stderr.write(`error: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(70);
});
