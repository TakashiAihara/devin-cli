#!/usr/bin/env bun
import { Argument, Command, InvalidArgumentError, Option } from "commander";
import {
  runAutomationCreate,
  runAutomationDelete,
  runAutomationGet,
  runAutomationsList,
  runAutomationSchemas,
  runAutomationTemplates,
  runAutomationUpdate,
  type AutomationCreateOptions,
  type AutomationIdOptions,
  type AutomationSchemasOptions,
  type AutomationTemplatesOptions,
  type AutomationUpdateOptions,
  type AutomationsListOptions,
} from "./commands/automations.ts";
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
  runNotesCreate,
  runNotesDelete,
  runNotesFolders,
  runNotesGet,
  runNotesList,
  runNotesUpdate,
  type NoteCreateOptions,
  type NoteIdOptions,
  type NoteUpdateOptions,
  type NotesFoldersOptions,
  type NotesListOptions,
} from "./commands/notes.ts";
import {
  DEPRECATED_NOTE,
  runScheduleCreate,
  runScheduleDelete,
  runScheduleGet,
  runSchedulesList,
  runScheduleUpdate,
  type ScheduleCreateOptions,
  type ScheduleIdOptions,
  type ScheduleUpdateOptions,
  type SchedulesListOptions,
} from "./commands/schedules.ts";
import { runSelf } from "./commands/self.ts";
import { VERSION } from "./version.ts";

const JSON_FLAG = "--json";
const JSON_HELP = "TSV ではなく JSON を stdout に出す";

const program = new Command();
program.exitOverride((e) => process.exit(e.exitCode === 0 ? 0 : 2));

program
  .name("devin-cli")
  .description(
    "Devin API v3 の self / billing / consumption / metrics / knowledge / automations / schedules",
  )
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

// list 系の --limit。ページを辿って集める総件数の上限 (省略時は全件)
const positiveInt = (value: string): number => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new InvalidArgumentError("1 以上の整数を指定する");
  return n;
};
const limitOption = () =>
  new Option("--limit <n>", "取得する最大件数 (省略時は全件)").argParser(positiveInt);

// 繰り返し指定できるオプション用 (--trigger / --agent-type / --metadata / --tags)
const append = (value: string, prev: string[] = []): string[] => [...prev, value];

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

const notes = program.command("notes").description("knowledge notes (org scope)");

notes
  .command("folders")
  .description("フォルダ一覧と note 数 (GET /knowledge/folders)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: NotesFoldersOptions) => {
    process.exit(await runNotesFolders(o));
  });

notes
  .command("list")
  .description("notes 一覧 (GET /knowledge/notes)")
  .addOption(orgOption())
  .addOption(limitOption())
  .option("--folder <path>", "folder path で絞る (notes folders の path 列)")
  .option("--search <q>", "検索文字列")
  .option("--pinned-repo <repo>", "pin された repo で絞る")
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: NotesListOptions) => {
    process.exit(await runNotesList(o));
  });

notes
  .command("get")
  .description("note 詳細 (GET /knowledge/notes/{note_id})")
  .argument("<note_id>", "note ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (noteId: string, o: Omit<NoteIdOptions, "noteId">) => {
    process.exit(await runNotesGet({ noteId, org: o.org, json: o.json }));
  });

notes
  .command("create")
  .description("note 作成 (POST /knowledge/notes)")
  .option("--title <title>", "note の名前")
  .option("--body <text>", "note 本文 (markdown)")
  .option("--body-file <path>", 'note 本文をファイルから読む ("-" で stdin)')
  .option("--trigger <text>", "note を使う条件の説明")
  .option("--folder-id <id>", "folder ID (notes folders の folder_id 列)")
  .option("--pinned-repo <repo>", "pin する repo")
  .option("--enabled", "有効化する")
  .option("--disabled", "無効化する")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: NoteCreateOptions) => {
    process.exit(await runNotesCreate(o));
  });

notes
  .command("update")
  .description("note 更新 (PUT /knowledge/notes/{note_id}。現在値に指定分をマージ)")
  .argument("<note_id>", "note ID")
  .option("--title <title>", "note の名前")
  .option("--body <text>", "note 本文 (markdown)")
  .option("--body-file <path>", 'note 本文をファイルから読む ("-" で stdin)')
  .option("--trigger <text>", "note を使う条件の説明")
  .option("--folder-id <id>", "folder ID")
  .option("--clear-folder", "folder の紐付けを外す")
  .option("--pinned-repo <repo>", "pin する repo")
  .option("--clear-pinned-repo", "pin を外す")
  .option("--enabled", "有効化する")
  .option("--disabled", "無効化する")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (noteId: string, o: Omit<NoteUpdateOptions, "noteId">) => {
    process.exit(await runNotesUpdate({ noteId, ...o }));
  });

notes
  .command("delete")
  .description("note 削除 (DELETE /knowledge/notes/{note_id})")
  .argument("<note_id>", "note ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (noteId: string, o: Omit<NoteIdOptions, "noteId">) => {
    process.exit(await runNotesDelete({ noteId, org: o.org, json: o.json }));
  });

const automations = program.command("automations").description("automations (org scope)");

automations
  .command("list")
  .description("automations 一覧 (GET /automations)")
  .addOption(orgOption())
  .addOption(limitOption())
  .option("--search <q>", "検索文字列")
  .option("--creator <id>", "作成者 (user_id / service_user_id) で絞る")
  .option("--event-type <type>", "トリガーの event_type で絞る (例: github:push)")
  .option(
    "--agent-type <type>",
    "action の agent type で絞る (繰り返し可。new_session/long_running/auto_triage/remediate_finding/triage_session/generic_assistant/incident_session/code_scan)",
    append,
    [],
  )
  .option("--enabled", "有効なものだけ")
  .option("--disabled", "無効なものだけ")
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: AutomationsListOptions) => {
    process.exit(await runAutomationsList(o));
  });

automations
  .command("get")
  .description("automation 詳細 (GET /automations/{automation_id})")
  .argument("<automation_id>", "automation ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (automationId: string, o: Omit<AutomationIdOptions, "automationId">) => {
    process.exit(await runAutomationGet({ automationId, org: o.org, json: o.json }));
  });

automations
  .command("create")
  .description("automation 作成 (POST /automations)")
  .option("--name <name>", "automation 名")
  .option("--run-as <who>", "organization / creator / service-user:<id>")
  .option("--trigger <event_type>", "トリガー event_type (繰り返し可。例: github:push)", append, [])
  .option("--prompt <text>", "start_session action のプロンプト")
  .option("--enabled", "有効化する")
  .option("--disabled", "無効化する")
  .option("--template-id <id>", "テンプレート ID (automations templates で確認)")
  .option("--metadata <k=v>", "metadata (繰り返し可)", append, [])
  .option("--body-json <json>", "AutomationCreateRequest 全体を JSON で渡す")
  .option("--body-file <path>", '同上をファイルから読む ("-" で stdin)')
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: AutomationCreateOptions) => {
    process.exit(await runAutomationCreate(o));
  });

automations
  .command("update")
  .description("automation 更新 (PATCH /automations/{automation_id})")
  .argument("<automation_id>", "automation ID")
  .option("--name <name>", "automation 名")
  .option("--enabled", "有効化する")
  .option("--disabled", "無効化する")
  .option("--body-json <json>", "AutomationUpdateRequest の差分を JSON で渡す")
  .option("--body-file <path>", '同上をファイルから読む ("-" で stdin)')
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (automationId: string, o: Omit<AutomationUpdateOptions, "automationId">) => {
    process.exit(await runAutomationUpdate({ automationId, ...o }));
  });

automations
  .command("delete")
  .description("automation 削除 (DELETE /automations/{automation_id}。soft delete)")
  .argument("<automation_id>", "automation ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (automationId: string, o: Omit<AutomationIdOptions, "automationId">) => {
    process.exit(await runAutomationDelete({ automationId, org: o.org, json: o.json }));
  });

automations
  .command("schemas")
  .description("トリガーのイベントスキーマ一覧 (GET /automations/schemas)")
  .option("--security-profile-id <id>", "security profile 前提でスキーマを解決する")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: AutomationSchemasOptions) => {
    process.exit(await runAutomationSchemas(o));
  });

automations
  .command("templates")
  .description("組み込みテンプレート一覧 (GET /automations/templates)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: AutomationTemplatesOptions) => {
    process.exit(await runAutomationTemplates(o));
  });

const schedules = program.command("schedules").description(`schedules (${DEPRECATED_NOTE})`);

const scheduleCommon = (cmd: Command) =>
  cmd
    .option("--name <name>", "schedule 名")
    .option("--prompt <text>", "起動する session への prompt")
    .option("--schedule-type <type>", "recurring / one_time")
    .option("--frequency <cron>", "繰り返しの cron 式 (recurring 用)")
    .option("--interval-count <n>", "cron の N 回ごとに実行", positiveInt)
    .option("--scheduled-at <datetime>", "one_time の実行時刻 (RFC3339)")
    .option("--agent <agent>", "devin / data_analyst")
    .option("--notify-on <when>", "always / failure / never")
    .option("--platform <platform>", "session の VM platform")
    .option("--playbook-id <id>", "playbook ID")
    .option("--skill-plugin <id>", "skill の plugin_identity (--skill-name と併用)")
    .option("--skill-name <name>", "skill 名 (--skill-plugin と併用)")
    .option("--tags <tag>", "session に付ける tag (繰り返し可)", append, [])
    .option("--slack-channel-id <id>", "通知先 Slack channel ID")
    .option("--slack-team-id <id>", "通知先 Slack team ID")
    .option("--target-devin-id <id>", "既存 session に紐付ける Devin ID")
    .option("--bypass-approval", "plan approval を skip する")
    .option("--body-json <json>", "リクエスト全体/差分を JSON で渡す (フラグとマージ、フラグ優先)")
    .option("--body-file <path>", '同上をファイルから読む ("-" で stdin)');

schedules
  .command("list")
  .description("schedules 一覧 (GET /schedules)")
  .addOption(orgOption())
  .addOption(limitOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: SchedulesListOptions) => {
    process.exit(await runSchedulesList(o));
  });

schedules
  .command("get")
  .description("schedule 詳細 (GET /schedules/{schedule_id})")
  .argument("<schedule_id>", "schedule ID (list の schedule_id 列)")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (scheduleId: string, o: Omit<ScheduleIdOptions, "scheduleId">) => {
    process.exit(await runScheduleGet({ scheduleId, org: o.org, json: o.json }));
  });

scheduleCommon(schedules.command("create").description("schedule 作成 (POST /schedules)"))
  .option("--create-as-user-id <id>", "この user として作成する")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (o: ScheduleCreateOptions) => {
    process.exit(await runScheduleCreate(o));
  });

scheduleCommon(
  schedules.command("update").description("schedule 更新 (PATCH /schedules/{schedule_id})"),
)
  .argument("<schedule_id>", "schedule ID")
  .option("--enabled", "有効化する")
  .option("--disabled", "無効化する")
  .option("--run-as-user-id <id>", "実行 user を変更する")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (scheduleId: string, o: Omit<ScheduleUpdateOptions, "scheduleId">) => {
    process.exit(await runScheduleUpdate({ scheduleId, ...o }));
  });

schedules
  .command("delete")
  .description("schedule 削除 (DELETE /schedules/{schedule_id}。soft delete)")
  .argument("<schedule_id>", "schedule ID")
  .addOption(orgOption())
  .option(JSON_FLAG, JSON_HELP)
  .action(async (scheduleId: string, o: Omit<ScheduleIdOptions, "scheduleId">) => {
    process.exit(await runScheduleDelete({ scheduleId, org: o.org, json: o.json }));
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
