import { guard, print } from "../lib.ts";
import { METRICS } from "./metrics.ts";

export const SHELLS = ["bash", "zsh", "fish"] as const;
export type Shell = (typeof SHELLS)[number];

export type CompletionOptions = { shell: Shell };

// 補完に出す語の一覧。cli.ts のコマンド定義と対応させる
const TOP_COMMANDS = [
  "self",
  "billing",
  "consumption",
  "metrics",
  "sessions",
  "notes",
  "automations",
  "schedules",
  "completion",
];
const CONSUMPTION_SUBCOMMANDS = ["daily", "user", "service-user", "session"];
const SESSIONS_SUBCOMMANDS = [
  "list",
  "get",
  "messages",
  "insights",
  "attachments",
  "create",
  "archive",
  "tags",
  "delete",
];
const NOTES_SUBCOMMANDS = ["folders", "list", "get", "create", "update", "delete"];
const AUTOMATIONS_SUBCOMMANDS = [
  "list",
  "get",
  "create",
  "update",
  "delete",
  "schemas",
  "templates",
];
const SCHEDULES_SUBCOMMANDS = ["list", "get", "create", "update", "delete"];

// sessions のサブコマンドごとのオプション (cli.ts と対応)
const SESSIONS_LIST_OPTS =
  "--limit --status --archived --active --tag --origin --user --repo --created-after --created-before --updated-after --updated-before --org --json";
const SESSIONS_MESSAGES_OPTS = "--limit --org --json";
const SESSIONS_CREATE_OPTS =
  "--prompt --title --repo --tag --playbook-id --attachment --mode --max-acu --platform --bypass-approval --org --json";
const SESSIONS_DELETE_OPTS = "--yes --archive --org --json";
const SESSIONS_PLAIN_OPTS = "--org --json";

// グループごとのオプション集合 (サブコマンド名より後でのみ有効)
const NOTES_OPTIONS =
  "--org --json --limit --folder --search --pinned-repo --title --body --body-file --trigger --folder-id --clear-folder --clear-pinned-repo --enabled --disabled";
const AUTOMATIONS_OPTIONS =
  "--org --json --limit --search --creator --event-type --agent-type --enabled --disabled --name --run-as --trigger --prompt --template-id --metadata --body-json --body-file --security-profile-id";
const SCHEDULES_OPTIONS =
  "--org --json --limit --name --prompt --schedule-type --frequency --interval-count --scheduled-at --agent --notify-on --platform --playbook-id --skill-plugin --skill-name --tags --slack-channel-id --slack-team-id --target-devin-id --bypass-approval --body-json --body-file --create-as-user-id --run-as-user-id --enabled --disabled";

// 値を取るオプション。直後の語では補完しない
const VALUE_OPTIONS = [
  "--days",
  "--org",
  "--limit",
  "--folder",
  "--search",
  "--pinned-repo",
  "--title",
  "--body",
  "--body-file",
  "--trigger",
  "--folder-id",
  "--creator",
  "--event-type",
  "--agent-type",
  "--name",
  "--run-as",
  "--prompt",
  "--template-id",
  "--metadata",
  "--body-json",
  "--security-profile-id",
  "--schedule-type",
  "--frequency",
  "--interval-count",
  "--scheduled-at",
  "--agent",
  "--notify-on",
  "--platform",
  "--playbook-id",
  "--skill-plugin",
  "--skill-name",
  "--tags",
  "--slack-channel-id",
  "--slack-team-id",
  "--target-devin-id",
  "--create-as-user-id",
  "--run-as-user-id",
  "--status",
  "--tag",
  "--origin",
  "--user",
  "--repo",
  "--created-after",
  "--created-before",
  "--updated-after",
  "--updated-before",
  "--attachment",
  "--mode",
  "--max-acu",
];

// bash: complete -F + compgen。値を取るオプションの直後では補完しない
const bashScript = `# devin-cli bash completion
# 生成: devin-cli completion bash
# 例: devin-cli completion bash > ~/.devin-cli-completion.bash
#     echo 'source ~/.devin-cli-completion.bash' >> ~/.bashrc

_devin_cli() {
  local cur prev cmd sub opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  cmd=""
  sub=""
  if [ "$COMP_CWORD" -ge 2 ]; then
    cmd="\${COMP_WORDS[1]}"
  fi
  if [ "$COMP_CWORD" -ge 3 ]; then
    sub="\${COMP_WORDS[2]}"
  fi

  # 値を取るオプションの直後では補完しない
  case "$prev" in
    ${VALUE_OPTIONS.join("|")}) return 0 ;;
  esac

  if [[ "$cur" == -* ]]; then
    opts="-h --help"
    if [ -z "$cmd" ]; then
      opts="$opts -V --version"
    else
      case "$cmd" in
        self) opts="$opts --json" ;;
        billing) opts="$opts --days --org --json" ;;
        consumption|metrics)
          # consumption / metrics は第 2 引数 (サブコマンド・metrics 名) の後でのみ有効
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts --days --org --json"
          fi
          ;;
        sessions)
          if [ "$COMP_CWORD" -ge 3 ]; then
            case "$sub" in
              list|insights) opts="$opts ${SESSIONS_LIST_OPTS}" ;;
              messages) opts="$opts ${SESSIONS_MESSAGES_OPTS}" ;;
              create) opts="$opts ${SESSIONS_CREATE_OPTS}" ;;
              delete) opts="$opts ${SESSIONS_DELETE_OPTS}" ;;
              *) opts="$opts ${SESSIONS_PLAIN_OPTS}" ;;
            esac
          fi
          ;;
        notes)
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts ${NOTES_OPTIONS}"
          fi
          ;;
        automations)
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts ${AUTOMATIONS_OPTIONS}"
          fi
          ;;
        schedules)
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts ${SCHEDULES_OPTIONS}"
          fi
          ;;
      esac
    fi
    COMPREPLY=($(compgen -W "$opts" -- "$cur"))
    return 0
  fi

  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=($(compgen -W "${TOP_COMMANDS.join(" ")}" -- "$cur"))
    return 0
  fi

  case "$cmd" in
    consumption)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${CONSUMPTION_SUBCOMMANDS.join(" ")}" -- "$cur"))
      fi
      ;;
    metrics)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${METRICS.join(" ")}" -- "$cur"))
      fi
      ;;
    sessions)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${SESSIONS_SUBCOMMANDS.join(" ")}" -- "$cur"))
      elif [ "$COMP_CWORD" -eq 3 ] && [ "$sub" = "tags" ]; then
        COMPREPLY=($(compgen -W "get add set" -- "$cur"))
      fi
      ;;
    notes)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${NOTES_SUBCOMMANDS.join(" ")}" -- "$cur"))
      fi
      ;;
    automations)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${AUTOMATIONS_SUBCOMMANDS.join(" ")}" -- "$cur"))
      fi
      ;;
    schedules)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${SCHEDULES_SUBCOMMANDS.join(" ")}" -- "$cur"))
      fi
      ;;
    completion)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${SHELLS.join(" ")}" -- "$cur"))
      fi
      ;;
  esac
}

complete -F _devin_cli devin-cli`;

// zsh: #compdef + _describe。words[CURRENT] が補完中の語、words[2] が第 1 引数
const zshScript = `#compdef devin-cli
# 生成: devin-cli completion zsh
# 例: この出力を fpath の通った場所の _devin-cli として保存するか、
#     ~/.zsh/completions/_devin-cli に保存して compinit をやり直す

_devin_cli() {
  local cmd="" sub=""
  (( CURRENT > 2 )) && cmd="\${words[2]}"
  (( CURRENT > 3 )) && sub="\${words[3]}"
  local -a candidates

  if [[ "$PREFIX" == -* ]]; then
    candidates=(-h --help)
    if [[ -z "$cmd" ]]; then
      candidates+=(-V --version)
    else
      case "$cmd" in
        self) candidates+=(--json) ;;
        billing) candidates+=(--days --org --json) ;;
        consumption|metrics)
          # consumption / metrics は第 2 引数の後でのみ有効
          (( CURRENT >= 4 )) && candidates+=(--days --org --json)
          ;;
        sessions)
          if (( CURRENT >= 4 )); then
            case "$sub" in
              list|insights) candidates+=(${SESSIONS_LIST_OPTS}) ;;
              messages) candidates+=(${SESSIONS_MESSAGES_OPTS}) ;;
              create) candidates+=(${SESSIONS_CREATE_OPTS}) ;;
              delete) candidates+=(${SESSIONS_DELETE_OPTS}) ;;
              *) candidates+=(${SESSIONS_PLAIN_OPTS}) ;;
            esac
          fi
          ;;
        notes)
          (( CURRENT >= 4 )) && candidates+=(${NOTES_OPTIONS})
          ;;
        automations)
          (( CURRENT >= 4 )) && candidates+=(${AUTOMATIONS_OPTIONS})
          ;;
        schedules)
          (( CURRENT >= 4 )) && candidates+=(${SCHEDULES_OPTIONS})
          ;;
      esac
    fi
  elif (( CURRENT == 2 )); then
    candidates=(${TOP_COMMANDS.join(" ")})
  elif (( CURRENT == 3 )); then
    case "$cmd" in
      consumption) candidates=(${CONSUMPTION_SUBCOMMANDS.join(" ")}) ;;
      metrics) candidates=(${METRICS.join(" ")}) ;;
      sessions) candidates=(${SESSIONS_SUBCOMMANDS.join(" ")}) ;;
      notes) candidates=(${NOTES_SUBCOMMANDS.join(" ")}) ;;
      automations) candidates=(${AUTOMATIONS_SUBCOMMANDS.join(" ")}) ;;
      schedules) candidates=(${SCHEDULES_SUBCOMMANDS.join(" ")}) ;;
      completion) candidates=(${SHELLS.join(" ")}) ;;
    esac
  elif (( CURRENT == 4 )) && [[ "$cmd" == "sessions" && "$sub" == "tags" ]]; then
    candidates=(get add set)
  fi

  if (( \${#candidates[@]} > 0 )); then
    _describe 'devin-cli' candidates
  fi
}

_devin_cli "$@"`;

// fish: complete ビルトイン。-n の条件で出す位置を絞る
const fishGroup = (name: string, subs: readonly string[]) =>
  [
    `# ${name} のサブコマンド`,
    `complete -c devin-cli -f -n '__fish_seen_subcommand_from ${name}; and not __fish_seen_subcommand_from ${subs.join(" ")}' -a '${subs.join(" ")}'`,
    // 値を取るオプションと boolean を分けて出す
    ...groupValueOptions(name).map(
      (o) => `complete -c devin-cli -l ${o.slice(2)} -x -n '__fish_seen_subcommand_from ${name}'`,
    ),
    ...groupBoolOptions(name).map(
      (o) => `complete -c devin-cli -l ${o.slice(2)} -n '__fish_seen_subcommand_from ${name}'`,
    ),
  ].join("\n");

// 各グループで値を取るオプション / boolean オプション
const GROUP_VALUE_OPTIONS: Record<string, string[]> = {
  notes: [
    "--org",
    "--limit",
    "--folder",
    "--search",
    "--pinned-repo",
    "--title",
    "--body",
    "--body-file",
    "--trigger",
    "--folder-id",
  ],
  automations: [
    "--org",
    "--limit",
    "--search",
    "--creator",
    "--event-type",
    "--agent-type",
    "--name",
    "--run-as",
    "--trigger",
    "--prompt",
    "--template-id",
    "--metadata",
    "--body-json",
    "--body-file",
    "--security-profile-id",
  ],
  schedules: [
    "--org",
    "--limit",
    "--name",
    "--prompt",
    "--schedule-type",
    "--frequency",
    "--interval-count",
    "--scheduled-at",
    "--agent",
    "--notify-on",
    "--platform",
    "--playbook-id",
    "--skill-plugin",
    "--skill-name",
    "--tags",
    "--slack-channel-id",
    "--slack-team-id",
    "--target-devin-id",
    "--body-json",
    "--body-file",
    "--create-as-user-id",
    "--run-as-user-id",
  ],
};
const GROUP_BOOL_OPTIONS: Record<string, string[]> = {
  notes: ["--enabled", "--disabled", "--clear-folder", "--clear-pinned-repo"],
  automations: ["--enabled", "--disabled"],
  schedules: ["--enabled", "--disabled", "--bypass-approval"],
};
const groupValueOptions = (name: string): string[] => GROUP_VALUE_OPTIONS[name] ?? [];
const groupBoolOptions = (name: string): string[] => GROUP_BOOL_OPTIONS[name] ?? [];

const fishScript = `# devin-cli fish completion
# 生成: devin-cli completion fish
# 例: この出力を ~/.config/fish/completions/devin-cli.fish に保存する

# トップレベルのサブコマンド
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'self' -d 'GET /v3/self。認証と principal の確認'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'billing' -d '直近 N 日の ACU 消費サマリ (合計・製品別・日別)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'consumption' -d '日次 ACU 消費 (組織・ユーザー・service user・session)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'metrics' -d '組織の利用 metrics'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'sessions' -d 'Devin セッション (一覧・詳細・メッセージ・insights・作成・archive・タグ・削除)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'notes' -d 'knowledge notes (org scope)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'automations' -d 'automations (org scope)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'schedules' -d 'schedules (org scope、deprecated)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'completion' -d 'シェル補完スクリプトを stdout に出す'

# consumption のサブコマンド (consumption の直後でのみ)
complete -c devin-cli -f -n '__fish_seen_subcommand_from consumption; and not __fish_seen_subcommand_from ${CONSUMPTION_SUBCOMMANDS.join(" ")}' -a '${CONSUMPTION_SUBCOMMANDS.join(" ")}'

# metrics 名 (metrics の直後でのみ)
complete -c devin-cli -f -n '__fish_seen_subcommand_from metrics; and not __fish_seen_subcommand_from ${METRICS.join(" ")}' -a '${METRICS.join(" ")}'

# sessions のサブコマンド (sessions の直後でのみ)
complete -c devin-cli -f -n '__fish_seen_subcommand_from sessions; and not __fish_seen_subcommand_from ${SESSIONS_SUBCOMMANDS.join(" ")}' -a '${SESSIONS_SUBCOMMANDS.join(" ")}'

# sessions tags の get / add / set (tags の直後でのみ)
complete -c devin-cli -f -n '__fish_seen_subcommand_from tags' -a 'get add set'

${fishGroup("notes", NOTES_SUBCOMMANDS)}

${fishGroup("automations", AUTOMATIONS_SUBCOMMANDS)}

${fishGroup("schedules", SCHEDULES_SUBCOMMANDS)}

# completion のシェル名
complete -c devin-cli -f -n '__fish_seen_subcommand_from completion' -a '${SHELLS.join(" ")}'

# オプション。self は --json のみ、billing / consumption の各サブコマンド / metrics は --days --org --json
complete -c devin-cli -s h -l help -d 'display help for command'
complete -c devin-cli -s V -l version -d 'output the version number' -n 'not __fish_seen_subcommand_from ${TOP_COMMANDS.join(" ")}'
complete -c devin-cli -l json -d 'TSV ではなく JSON を stdout に出す' -n '__fish_seen_subcommand_from self billing metrics sessions notes automations schedules; or __fish_seen_subcommand_from ${CONSUMPTION_SUBCOMMANDS.join(" ")}'
complete -c devin-cli -l days -x -d '直近 N 暦日' -n '__fish_seen_subcommand_from billing metrics; or __fish_seen_subcommand_from ${CONSUMPTION_SUBCOMMANDS.join(" ")}'
complete -c devin-cli -l org -x -d 'org ID (省略時は自動解決)' -n '__fish_seen_subcommand_from billing metrics sessions notes automations schedules; or __fish_seen_subcommand_from ${CONSUMPTION_SUBCOMMANDS.join(" ")}'

# sessions list / insights のフィルタと --limit
complete -c devin-cli -l limit -x -d '出力する最大件数' -n '__fish_seen_subcommand_from list insights'
complete -c devin-cli -l status -x -d 'status で絞る' -n '__fish_seen_subcommand_from list insights'
complete -c devin-cli -l archived -d 'is_archived=true のみ' -n '__fish_seen_subcommand_from list insights'
complete -c devin-cli -l active -d 'is_archived=false のみ' -n '__fish_seen_subcommand_from list insights'
complete -c devin-cli -l tag -x -d 'タグで絞る' -n '__fish_seen_subcommand_from list insights'
complete -c devin-cli -l origin -x -d 'origin で絞る' -n '__fish_seen_subcommand_from list insights'
complete -c devin-cli -l user -x -d '作成ユーザーで絞る' -n '__fish_seen_subcommand_from list insights'
complete -c devin-cli -l repo -x -d 'リポジトリで絞る' -n '__fish_seen_subcommand_from list insights'
complete -c devin-cli -l created-after -x -d '作成日時の下限' -n '__fish_seen_subcommand_from list insights'
complete -c devin-cli -l created-before -x -d '作成日時の上限' -n '__fish_seen_subcommand_from list insights'
complete -c devin-cli -l updated-after -x -d '更新日時の下限' -n '__fish_seen_subcommand_from list insights'
complete -c devin-cli -l updated-before -x -d '更新日時の上限' -n '__fish_seen_subcommand_from list insights'

# messages の --limit
complete -c devin-cli -l limit -x -d '出力する最大件数' -n '__fish_seen_subcommand_from messages'

# create のオプション
complete -c devin-cli -l prompt -x -d 'プロンプト' -n '__fish_seen_subcommand_from create'
complete -c devin-cli -l title -x -d 'タイトル' -n '__fish_seen_subcommand_from create'
complete -c devin-cli -l repo -x -d '対象リポジトリ' -n '__fish_seen_subcommand_from create'
complete -c devin-cli -l tag -x -d 'タグ' -n '__fish_seen_subcommand_from create'
complete -c devin-cli -l playbook-id -x -d 'playbook ID' -n '__fish_seen_subcommand_from create'
complete -c devin-cli -l attachment -x -d '添付 URL' -n '__fish_seen_subcommand_from create'
complete -c devin-cli -l mode -x -d 'Devin モード' -n '__fish_seen_subcommand_from create'
complete -c devin-cli -l max-acu -x -d 'ACU 上限' -n '__fish_seen_subcommand_from create'
complete -c devin-cli -l platform -x -d 'VM platform / outpost pool 名' -n '__fish_seen_subcommand_from create'
complete -c devin-cli -l bypass-approval -d 'safe mode の承認をバイパスする' -n '__fish_seen_subcommand_from create'

# delete のオプション
complete -c devin-cli -l yes -d '実際に DELETE を実行する' -n '__fish_seen_subcommand_from delete'
complete -c devin-cli -l archive -d '削除と同時に archive する' -n '__fish_seen_subcommand_from delete'`;

const SCRIPTS: Record<Shell, string> = { bash: bashScript, zsh: zshScript, fish: fishScript };

export const runCompletion = guard(async (o: CompletionOptions) => {
  print(SCRIPTS[o.shell]);
  return 0;
});
