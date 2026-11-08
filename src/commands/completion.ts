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
  "repositories",
  "code-scans",
  "snapshot",
  "sessions",
  "notes",
  "automations",
  "schedules",
  "members",
  "playbooks",
  "pr-reviews",
  "attachments",
  "security-profiles",
  "security-profile-settings",
  "default-platform",
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
const MEMBERS_SUBCOMMANDS = ["list", "get", "idp-users"];
const PLAYBOOKS_SUBCOMMANDS = ["list", "get", "create", "update", "delete"];
const PR_REVIEWS_SUBCOMMANDS = ["get", "create"];
const ATTACHMENTS_SUBCOMMANDS = ["upload", "download"];
const SECURITY_PROFILES_SUBCOMMANDS = ["list", "get", "create", "update", "delete"];
const SECURITY_PROFILE_SETTINGS_SUBCOMMANDS = ["get", "update"];
const DEFAULT_PLATFORM_SUBCOMMANDS = ["get", "set"];

// repositories は list がリーフ、indexing / indexing-repo / indexing-branch が
// さらにサブコマンドを持つ 3 段構成。snapshot も blueprints / builds の下にリーフがある
const REPOSITORIES_SUBCOMMANDS = ["list", "indexing", "indexing-repo", "indexing-branch"];
const INDEXING_SUBCOMMANDS = ["list", "set", "delete"];
const INDEXING_REPO_SUBCOMMANDS = ["get", "set", "delete"];
const INDEXING_BRANCH_SUBCOMMANDS = ["delete"];
const CODE_SCANS_SUBCOMMANDS = ["findings", "metrics", "scans", "profiles"];
const SNAPSHOT_SUBCOMMANDS = ["blueprints", "builds"];
const SNAPSHOT_BLUEPRINTS_SUBCOMMANDS = [
  "list",
  "get",
  "create",
  "update",
  "delete",
  "contents",
  "files",
];
const SNAPSHOT_BLUEPRINT_FILES_SUBCOMMANDS = ["list", "upload", "delete"];
const SNAPSHOT_BUILDS_SUBCOMMANDS = ["list", "get", "create", "logs", "cancel", "pin", "unpin"];

// sessions のサブコマンドごとのオプション (cli.ts と対応)
const SESSIONS_LIST_OPTS =
  "--limit --status --archived --active --tag --origin --user --repo --created-after --created-before --updated-after --updated-before --org --json";
const SESSIONS_MESSAGES_OPTS = "--limit --org --json";
const SESSIONS_CREATE_OPTS =
  "--prompt --title --repo --tag --playbook-id --attachment --mode --max-acu --platform --bypass-approval --org --json";
const SESSIONS_DELETE_OPTS = "--yes --archive --org --json";
const SESSIONS_PLAIN_OPTS = "--org --json";

// code-scans はフラットなのでリーフごとのオプションを出す (sessions と同じ方式)。
// repositories / snapshot はグループ単位の和集合 (notes / automations と同じ方式)
const CODE_SCANS_FINDINGS_OPTS =
  "--limit --repo --scan --q --severity --status --payoff --org --json";
const CODE_SCANS_METRICS_OPTS = "--days --org --json";
const CODE_SCANS_SCANS_OPTS = "--limit --repo --type --days --org --json";
const CODE_SCANS_PROFILES_OPTS = "--limit --org --json";
const REPOSITORIES_OPTIONS = "--limit --filter --branch --org --json";
const SNAPSHOT_BLUEPRINTS_OPTIONS =
  "--repo --source --contents --contents-file --position --build-on-default-branch --report-check-runs --name --org --json";
const SNAPSHOT_BUILDS_OPTIONS = "--limit --status --active --yes --org --json";

// グループごとのオプション集合 (サブコマンド名より後でのみ有効)
const NOTES_OPTIONS =
  "--org --json --limit --folder --search --pinned-repo --title --body --body-file --trigger --folder-id --clear-folder --clear-pinned-repo --enabled --disabled";
const AUTOMATIONS_OPTIONS =
  "--org --json --limit --search --creator --event-type --agent-type --enabled --disabled --name --run-as --trigger --prompt --template-id --metadata --body-json --body-file --security-profile-id";
const SCHEDULES_OPTIONS =
  "--org --json --limit --name --prompt --schedule-type --frequency --interval-count --scheduled-at --agent --notify-on --platform --playbook-id --skill-plugin --skill-name --tags --slack-channel-id --slack-team-id --target-devin-id --bypass-approval --body-json --body-file --create-as-user-id --run-as-user-id --enabled --disabled";
// org-resources 系。グループ内の全サブコマンドのオプション和集合 (notes/automations/schedules と同じ方式)
const MEMBERS_OPTIONS = "--org --json --limit";
const PLAYBOOKS_OPTIONS =
  "--org --json --limit --include-enterprise --title --body --body-file --macro --structured-output-schema";
const PR_REVIEWS_OPTIONS = "--org --json --commit-sha";
const ATTACHMENTS_OPTIONS = "--org --json --out";
const SECURITY_PROFILES_OPTIONS =
  "--org --json --limit --name --enforcement-level --git-access-level --devin-mcp-read-only --remove-github-cli-token --mcp-server --clear-mcp-config --net-policy-json --slack-channel-access-json --teams-channel-access-json --slack-dm-scope --teams-dm-scope --teams-group-chat-scope";
const SECURITY_PROFILE_SETTINGS_OPTIONS =
  "--org --json --default --default-profile --automations-default --automations-default-profile";
const DEFAULT_PLATFORM_OPTIONS = "--org --json --platform --outpost-pool-id --clear";

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
  // repositories / code-scans / snapshot 用
  "--filter",
  "--branch",
  "--scan",
  "--q",
  "--severity",
  "--payoff",
  "--type",
  "--source",
  "--contents",
  "--contents-file",
  "--position",
  "--build-on-default-branch",
  "--report-check-runs",
  // org-resources 系 (members / playbooks / pr-reviews / attachments / security-profiles / default-platform)
  "--macro",
  "--structured-output-schema",
  "--commit-sha",
  "--out",
  "--enforcement-level",
  "--git-access-level",
  "--devin-mcp-read-only",
  "--remove-github-cli-token",
  "--mcp-server",
  "--net-policy-json",
  "--slack-channel-access-json",
  "--teams-channel-access-json",
  "--slack-dm-scope",
  "--teams-dm-scope",
  "--teams-group-chat-scope",
  "--default",
  "--default-profile",
  "--automations-default",
  "--automations-default-profile",
  "--outpost-pool-id",
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
        repositories)
          # 3 段構成でもリーフの位置 (第 3 語以降) では和集合のオプションを出す
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts ${REPOSITORIES_OPTIONS}"
          fi
          ;;
        code-scans)
          if [ "$COMP_CWORD" -ge 3 ]; then
            case "$sub" in
              findings) opts="$opts ${CODE_SCANS_FINDINGS_OPTS}" ;;
              metrics) opts="$opts ${CODE_SCANS_METRICS_OPTS}" ;;
              scans) opts="$opts ${CODE_SCANS_SCANS_OPTS}" ;;
              profiles) opts="$opts ${CODE_SCANS_PROFILES_OPTS}" ;;
            esac
          fi
          ;;
        snapshot)
          if [ "$COMP_CWORD" -ge 3 ]; then
            case "$sub" in
              blueprints) opts="$opts ${SNAPSHOT_BLUEPRINTS_OPTIONS}" ;;
              builds) opts="$opts ${SNAPSHOT_BUILDS_OPTIONS}" ;;
            esac
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
        members)
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts ${MEMBERS_OPTIONS}"
          fi
          ;;
        playbooks)
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts ${PLAYBOOKS_OPTIONS}"
          fi
          ;;
        pr-reviews)
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts ${PR_REVIEWS_OPTIONS}"
          fi
          ;;
        attachments)
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts ${ATTACHMENTS_OPTIONS}"
          fi
          ;;
        security-profiles)
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts ${SECURITY_PROFILES_OPTIONS}"
          fi
          ;;
        security-profile-settings)
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts ${SECURITY_PROFILE_SETTINGS_OPTIONS}"
          fi
          ;;
        default-platform)
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts ${DEFAULT_PLATFORM_OPTIONS}"
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
    repositories)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${REPOSITORIES_SUBCOMMANDS.join(" ")}" -- "$cur"))
      elif [ "$COMP_CWORD" -eq 3 ]; then
        # indexing 系はグループなのでさらにサブコマンドを出す (list はリーフなので出さない)
        case "$sub" in
          indexing) COMPREPLY=($(compgen -W "${INDEXING_SUBCOMMANDS.join(" ")}" -- "$cur")) ;;
          indexing-repo)
            COMPREPLY=($(compgen -W "${INDEXING_REPO_SUBCOMMANDS.join(" ")}" -- "$cur"))
            ;;
          indexing-branch)
            COMPREPLY=($(compgen -W "${INDEXING_BRANCH_SUBCOMMANDS.join(" ")}" -- "$cur"))
            ;;
        esac
      fi
      ;;
    code-scans)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${CODE_SCANS_SUBCOMMANDS.join(" ")}" -- "$cur"))
      fi
      ;;
    snapshot)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${SNAPSHOT_SUBCOMMANDS.join(" ")}" -- "$cur"))
      elif [ "$COMP_CWORD" -eq 3 ]; then
        case "$sub" in
          blueprints) COMPREPLY=($(compgen -W "${SNAPSHOT_BLUEPRINTS_SUBCOMMANDS.join(" ")}" -- "$cur")) ;;
          builds) COMPREPLY=($(compgen -W "${SNAPSHOT_BUILDS_SUBCOMMANDS.join(" ")}" -- "$cur")) ;;
        esac
      elif [ "$COMP_CWORD" -eq 4 ] && [ "$sub" = "blueprints" ] && [ "\${COMP_WORDS[3]}" = "files" ]; then
        COMPREPLY=($(compgen -W "${SNAPSHOT_BLUEPRINT_FILES_SUBCOMMANDS.join(" ")}" -- "$cur"))
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
    members)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${MEMBERS_SUBCOMMANDS.join(" ")}" -- "$cur"))
      fi
      ;;
    playbooks)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${PLAYBOOKS_SUBCOMMANDS.join(" ")}" -- "$cur"))
      fi
      ;;
    pr-reviews)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${PR_REVIEWS_SUBCOMMANDS.join(" ")}" -- "$cur"))
      fi
      ;;
    attachments)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${ATTACHMENTS_SUBCOMMANDS.join(" ")}" -- "$cur"))
      fi
      ;;
    security-profiles)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${SECURITY_PROFILES_SUBCOMMANDS.join(" ")}" -- "$cur"))
      fi
      ;;
    security-profile-settings)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${SECURITY_PROFILE_SETTINGS_SUBCOMMANDS.join(" ")}" -- "$cur"))
      fi
      ;;
    default-platform)
      if [ "$COMP_CWORD" -eq 2 ]; then
        COMPREPLY=($(compgen -W "${DEFAULT_PLATFORM_SUBCOMMANDS.join(" ")}" -- "$cur"))
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
        repositories)
          # 3 段構成でもリーフの位置 (第 3 語以降) では和集合のオプションを出す
          (( CURRENT >= 4 )) && candidates+=(${REPOSITORIES_OPTIONS})
          ;;
        code-scans)
          if (( CURRENT >= 4 )); then
            case "$sub" in
              findings) candidates+=(${CODE_SCANS_FINDINGS_OPTS}) ;;
              metrics) candidates+=(${CODE_SCANS_METRICS_OPTS}) ;;
              scans) candidates+=(${CODE_SCANS_SCANS_OPTS}) ;;
              profiles) candidates+=(${CODE_SCANS_PROFILES_OPTS}) ;;
            esac
          fi
          ;;
        snapshot)
          if (( CURRENT >= 4 )); then
            case "$sub" in
              blueprints) candidates+=(${SNAPSHOT_BLUEPRINTS_OPTIONS}) ;;
              builds) candidates+=(${SNAPSHOT_BUILDS_OPTIONS}) ;;
            esac
          fi
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
        members)
          (( CURRENT >= 4 )) && candidates+=(${MEMBERS_OPTIONS})
          ;;
        playbooks)
          (( CURRENT >= 4 )) && candidates+=(${PLAYBOOKS_OPTIONS})
          ;;
        pr-reviews)
          (( CURRENT >= 4 )) && candidates+=(${PR_REVIEWS_OPTIONS})
          ;;
        attachments)
          (( CURRENT >= 4 )) && candidates+=(${ATTACHMENTS_OPTIONS})
          ;;
        security-profiles)
          (( CURRENT >= 4 )) && candidates+=(${SECURITY_PROFILES_OPTIONS})
          ;;
        security-profile-settings)
          (( CURRENT >= 4 )) && candidates+=(${SECURITY_PROFILE_SETTINGS_OPTIONS})
          ;;
        default-platform)
          (( CURRENT >= 4 )) && candidates+=(${DEFAULT_PLATFORM_OPTIONS})
          ;;
      esac
    fi
  elif (( CURRENT == 2 )); then
    candidates=(${TOP_COMMANDS.join(" ")})
  elif (( CURRENT == 3 )); then
    case "$cmd" in
      consumption) candidates=(${CONSUMPTION_SUBCOMMANDS.join(" ")}) ;;
      metrics) candidates=(${METRICS.join(" ")}) ;;
      repositories) candidates=(${REPOSITORIES_SUBCOMMANDS.join(" ")}) ;;
      code-scans) candidates=(${CODE_SCANS_SUBCOMMANDS.join(" ")}) ;;
      snapshot) candidates=(${SNAPSHOT_SUBCOMMANDS.join(" ")}) ;;
      sessions) candidates=(${SESSIONS_SUBCOMMANDS.join(" ")}) ;;
      notes) candidates=(${NOTES_SUBCOMMANDS.join(" ")}) ;;
      automations) candidates=(${AUTOMATIONS_SUBCOMMANDS.join(" ")}) ;;
      schedules) candidates=(${SCHEDULES_SUBCOMMANDS.join(" ")}) ;;
      members) candidates=(${MEMBERS_SUBCOMMANDS.join(" ")}) ;;
      playbooks) candidates=(${PLAYBOOKS_SUBCOMMANDS.join(" ")}) ;;
      pr-reviews) candidates=(${PR_REVIEWS_SUBCOMMANDS.join(" ")}) ;;
      attachments) candidates=(${ATTACHMENTS_SUBCOMMANDS.join(" ")}) ;;
      security-profiles) candidates=(${SECURITY_PROFILES_SUBCOMMANDS.join(" ")}) ;;
      security-profile-settings) candidates=(${SECURITY_PROFILE_SETTINGS_SUBCOMMANDS.join(" ")}) ;;
      default-platform) candidates=(${DEFAULT_PLATFORM_SUBCOMMANDS.join(" ")}) ;;
      completion) candidates=(${SHELLS.join(" ")}) ;;
    esac
  elif (( CURRENT == 4 )); then
    if [[ "$cmd" == "sessions" && "$sub" == "tags" ]]; then
      candidates=(get add set)
    else
      # repositories / snapshot のグループの下のサブコマンド
      case "$cmd:$sub" in
        repositories:indexing) candidates=(${INDEXING_SUBCOMMANDS.join(" ")}) ;;
        repositories:indexing-repo) candidates=(${INDEXING_REPO_SUBCOMMANDS.join(" ")}) ;;
        repositories:indexing-branch) candidates=(${INDEXING_BRANCH_SUBCOMMANDS.join(" ")}) ;;
        snapshot:blueprints) candidates=(${SNAPSHOT_BLUEPRINTS_SUBCOMMANDS.join(" ")}) ;;
        snapshot:builds) candidates=(${SNAPSHOT_BUILDS_SUBCOMMANDS.join(" ")}) ;;
      esac
    fi
  elif (( CURRENT == 5 )) && [[ "$cmd" == "snapshot" && "$sub" == "blueprints" && "\${words[4]}" == "files" ]]; then
    candidates=(${SNAPSHOT_BLUEPRINT_FILES_SUBCOMMANDS.join(" ")})
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
  // リーフごとに有効なオプションは違うが、fish ではグループ単位の和集合で出す
  repositories: ["--org", "--limit", "--filter", "--branch"],
  "code-scans": [
    "--org",
    "--limit",
    "--repo",
    "--scan",
    "--q",
    "--severity",
    "--status",
    "--payoff",
    "--days",
    "--type",
  ],
  snapshot: [
    "--org",
    "--repo",
    "--source",
    "--contents",
    "--contents-file",
    "--position",
    "--build-on-default-branch",
    "--report-check-runs",
    "--name",
    "--limit",
    "--status",
  ],
  members: ["--org", "--limit"],
  playbooks: [
    "--org",
    "--limit",
    "--title",
    "--body",
    "--body-file",
    "--macro",
    "--structured-output-schema",
  ],
  "pr-reviews": ["--org", "--commit-sha"],
  attachments: ["--org", "--out"],
  "security-profiles": [
    "--org",
    "--limit",
    "--name",
    "--enforcement-level",
    "--git-access-level",
    "--devin-mcp-read-only",
    "--remove-github-cli-token",
    "--mcp-server",
    "--net-policy-json",
    "--slack-channel-access-json",
    "--teams-channel-access-json",
    "--slack-dm-scope",
    "--teams-dm-scope",
    "--teams-group-chat-scope",
  ],
  "security-profile-settings": [
    "--org",
    "--default",
    "--default-profile",
    "--automations-default",
    "--automations-default-profile",
  ],
  "default-platform": ["--org", "--platform", "--outpost-pool-id"],
};
const GROUP_BOOL_OPTIONS: Record<string, string[]> = {
  notes: ["--enabled", "--disabled", "--clear-folder", "--clear-pinned-repo"],
  automations: ["--enabled", "--disabled"],
  schedules: ["--enabled", "--disabled", "--bypass-approval"],
  snapshot: ["--active", "--yes"],
  playbooks: ["--include-enterprise"],
  "security-profiles": ["--clear-mcp-config"],
  "default-platform": ["--clear"],
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
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'repositories' -d 'org scope の repositories / indexing'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'code-scans' -d 'org scope の code-scans (read 系)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'snapshot' -d 'snapshot-setup の blueprints / builds'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'sessions' -d 'Devin セッション (一覧・詳細・メッセージ・insights・作成・archive・タグ・削除)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'notes' -d 'knowledge notes (org scope)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'automations' -d 'automations (org scope)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'schedules' -d 'schedules (org scope、deprecated)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'members' -d 'org メンバー (v3beta1。list/get/idp-users)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'playbooks' -d 'org の playbook CRUD'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'pr-reviews' -d 'PR review の起動・参照 (一覧 API は無く PR 単位)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'attachments' -d 'org attachments の upload/download'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'security-profiles' -d 'org の security profile CRUD (v3beta1)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'security-profile-settings' -d 'org の security profile 既定値 (v3beta1)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'default-platform' -d '新規 session の既定 platform (v3beta1)'
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'completion' -d 'シェル補完スクリプトを stdout に出す'

# consumption のサブコマンド (consumption の直後でのみ)
complete -c devin-cli -f -n '__fish_seen_subcommand_from consumption; and not __fish_seen_subcommand_from ${CONSUMPTION_SUBCOMMANDS.join(" ")}' -a '${CONSUMPTION_SUBCOMMANDS.join(" ")}'

# metrics 名 (metrics の直後でのみ)
complete -c devin-cli -f -n '__fish_seen_subcommand_from metrics; and not __fish_seen_subcommand_from ${METRICS.join(" ")}' -a '${METRICS.join(" ")}'

# sessions のサブコマンド (sessions の直後でのみ)
complete -c devin-cli -f -n '__fish_seen_subcommand_from sessions; and not __fish_seen_subcommand_from ${SESSIONS_SUBCOMMANDS.join(" ")}' -a '${SESSIONS_SUBCOMMANDS.join(" ")}'

# sessions tags の get / add / set (tags の直後でのみ)
complete -c devin-cli -f -n '__fish_seen_subcommand_from tags' -a 'get add set'

${fishGroup("repositories", REPOSITORIES_SUBCOMMANDS)}

# repositories indexing 系のサブコマンド (グループ名の直後でのみ)
complete -c devin-cli -f -n '__fish_seen_subcommand_from indexing; and not __fish_seen_subcommand_from list set delete' -a 'list set delete'
complete -c devin-cli -f -n '__fish_seen_subcommand_from indexing-repo; and not __fish_seen_subcommand_from get set delete' -a 'get set delete'
complete -c devin-cli -f -n '__fish_seen_subcommand_from indexing-branch; and not __fish_seen_subcommand_from delete' -a 'delete'

${fishGroup("code-scans", CODE_SCANS_SUBCOMMANDS)}

${fishGroup("snapshot", SNAPSHOT_SUBCOMMANDS)}

# snapshot blueprints / builds のサブコマンドと、blueprints files のサブコマンド
complete -c devin-cli -f -n '__fish_seen_subcommand_from blueprints; and not __fish_seen_subcommand_from list get create update delete contents files' -a 'list get create update delete contents files'
complete -c devin-cli -f -n '__fish_seen_subcommand_from builds; and not __fish_seen_subcommand_from list get create logs cancel pin unpin' -a 'list get create logs cancel pin unpin'
complete -c devin-cli -f -n '__fish_seen_subcommand_from files; and not __fish_seen_subcommand_from list upload delete' -a 'list upload delete'

${fishGroup("notes", NOTES_SUBCOMMANDS)}

${fishGroup("automations", AUTOMATIONS_SUBCOMMANDS)}

${fishGroup("schedules", SCHEDULES_SUBCOMMANDS)}

${fishGroup("members", MEMBERS_SUBCOMMANDS)}

${fishGroup("playbooks", PLAYBOOKS_SUBCOMMANDS)}

${fishGroup("pr-reviews", PR_REVIEWS_SUBCOMMANDS)}

${fishGroup("attachments", ATTACHMENTS_SUBCOMMANDS)}

${fishGroup("security-profiles", SECURITY_PROFILES_SUBCOMMANDS)}

${fishGroup("security-profile-settings", SECURITY_PROFILE_SETTINGS_SUBCOMMANDS)}

${fishGroup("default-platform", DEFAULT_PLATFORM_SUBCOMMANDS)}

# completion のシェル名
complete -c devin-cli -f -n '__fish_seen_subcommand_from completion' -a '${SHELLS.join(" ")}'

# オプション。self は --json のみ、billing / consumption の各サブコマンド / metrics は --days --org --json
complete -c devin-cli -s h -l help -d 'display help for command'
complete -c devin-cli -s V -l version -d 'output the version number' -n 'not __fish_seen_subcommand_from ${TOP_COMMANDS.join(" ")}'
complete -c devin-cli -l json -d 'TSV ではなく JSON を stdout に出す' -n '__fish_seen_subcommand_from self billing metrics repositories code-scans snapshot sessions notes automations schedules members playbooks pr-reviews attachments security-profiles security-profile-settings default-platform; or __fish_seen_subcommand_from ${CONSUMPTION_SUBCOMMANDS.join(" ")}'
complete -c devin-cli -l days -x -d '直近 N 暦日' -n '__fish_seen_subcommand_from billing metrics; or __fish_seen_subcommand_from ${CONSUMPTION_SUBCOMMANDS.join(" ")}'
complete -c devin-cli -l org -x -d 'org ID (省略時は自動解決)' -n '__fish_seen_subcommand_from billing metrics repositories code-scans snapshot sessions notes automations schedules members playbooks pr-reviews attachments security-profiles security-profile-settings default-platform; or __fish_seen_subcommand_from ${CONSUMPTION_SUBCOMMANDS.join(" ")}'

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
