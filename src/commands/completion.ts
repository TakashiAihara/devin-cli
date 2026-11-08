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
  "completion",
];
const CONSUMPTION_SUBCOMMANDS = ["daily", "user", "service-user", "session"];

// bash: complete -F + compgen。値を取るオプション (--days / --org) の直後では補完しない
const bashScript = `# devin-cli bash completion
# 生成: devin-cli completion bash
# 例: devin-cli completion bash > ~/.devin-cli-completion.bash
#     echo 'source ~/.devin-cli-completion.bash' >> ~/.bashrc

_devin_cli() {
  local cur prev cmd opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  cmd=""
  if [ "$COMP_CWORD" -ge 2 ]; then
    cmd="\${COMP_WORDS[1]}"
  fi

  # --days / --org は値を取るので、値の位置では補完しない
  case "$prev" in
    --days|--org) return 0 ;;
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
        repositories|code-scans|snapshot)
          # org scope の各コマンドはリーフの位置 (第 3 語以降) でのみ --org / --json が有効
          if [ "$COMP_CWORD" -ge 3 ]; then
            opts="$opts --org --json"
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
  local cmd=""
  (( CURRENT > 2 )) && cmd="\${words[2]}"
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
        repositories|code-scans|snapshot)
          # org scope の各コマンドはリーフの位置 (第 3 語以降) でのみ --org / --json が有効
          (( CURRENT >= 4 )) && candidates+=(--org --json)
          ;;
      esac
    fi
  elif (( CURRENT == 2 )); then
    candidates=(${TOP_COMMANDS.join(" ")})
  elif (( CURRENT == 3 )); then
    case "$cmd" in
      consumption) candidates=(${CONSUMPTION_SUBCOMMANDS.join(" ")}) ;;
      metrics) candidates=(${METRICS.join(" ")}) ;;
      completion) candidates=(${SHELLS.join(" ")}) ;;
    esac
  fi

  if (( \${#candidates[@]} > 0 )); then
    _describe 'devin-cli' candidates
  fi
}

_devin_cli "$@"`;

// fish: complete ビルトイン。-n の条件で出す位置を絞る
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
complete -c devin-cli -f -n '__fish_use_subcommand' -a 'completion' -d 'シェル補完スクリプトを stdout に出す'

# consumption のサブコマンド (consumption の直後でのみ)
complete -c devin-cli -f -n '__fish_seen_subcommand_from consumption; and not __fish_seen_subcommand_from ${CONSUMPTION_SUBCOMMANDS.join(" ")}' -a '${CONSUMPTION_SUBCOMMANDS.join(" ")}'

# metrics 名 (metrics の直後でのみ)
complete -c devin-cli -f -n '__fish_seen_subcommand_from metrics; and not __fish_seen_subcommand_from ${METRICS.join(" ")}' -a '${METRICS.join(" ")}'

# completion のシェル名
complete -c devin-cli -f -n '__fish_seen_subcommand_from completion' -a '${SHELLS.join(" ")}'

# オプション。self は --json のみ、billing / consumption の各サブコマンド / metrics は --days --org --json
complete -c devin-cli -s h -l help -d 'display help for command'
complete -c devin-cli -s V -l version -d 'output the version number' -n 'not __fish_seen_subcommand_from ${TOP_COMMANDS.join(" ")}'
complete -c devin-cli -l json -d 'TSV ではなく JSON を stdout に出す' -n '__fish_seen_subcommand_from self billing metrics repositories code-scans snapshot; or __fish_seen_subcommand_from ${CONSUMPTION_SUBCOMMANDS.join(" ")}'
complete -c devin-cli -l days -x -d '直近 N 暦日' -n '__fish_seen_subcommand_from billing metrics; or __fish_seen_subcommand_from ${CONSUMPTION_SUBCOMMANDS.join(" ")}'
complete -c devin-cli -l org -x -d 'org ID (省略時は自動解決)' -n '__fish_seen_subcommand_from billing metrics repositories code-scans snapshot; or __fish_seen_subcommand_from ${CONSUMPTION_SUBCOMMANDS.join(" ")}'`;

const SCRIPTS: Record<Shell, string> = { bash: bashScript, zsh: zshScript, fish: fishScript };

export const runCompletion = guard(async (o: CompletionOptions) => {
  print(SCRIPTS[o.shell]);
  return 0;
});
