import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { makeSandbox, removeSandbox, runCli, type Sandbox } from "./helpers/cli.ts";

// completion は API を呼ばないので fake サーバは立てず runCli で直接実行する
let sb: Sandbox;
beforeEach(() => {
  sb = makeSandbox();
});
afterEach(() => {
  removeSandbox(sb);
});

const TOP_COMMANDS = [
  "self",
  "billing",
  "consumption",
  "metrics",
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
const METRIC_NAMES = ["usage", "sessions", "prs", "searches", "dau", "wau", "mau", "active-users"];
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
const NEW_WORDS = ["folders", "list", "get", "create", "update", "delete", "schemas", "templates"];
// org-resources 系だけが持つサブコマンド名
const ORG_WORDS = ["idp-users", "upload", "download", "set"];
const ALL_WORDS = [
  ...TOP_COMMANDS,
  ...CONSUMPTION_SUBCOMMANDS,
  ...METRIC_NAMES,
  ...SESSIONS_SUBCOMMANDS,
  ...NEW_WORDS,
  ...ORG_WORDS,
];
// org-resources 系だけが持つオプション
const ORG_OPTS = [
  "--commit-sha",
  "--out",
  "--macro",
  "--include-enterprise",
  "--enforcement-level",
  "--outpost-pool-id",
  "--clear",
];

describe("completion", () => {
  test("bash は complete -F のスクリプトを出す", async () => {
    const r = await runCli(sb, ["completion", "bash"]);
    expect(r.code).toBe(0);
    expect(r.err).toBe("");
    expect(r.out).toContain("complete -F _devin_cli devin-cli");
    expect(r.out).toContain("compgen -W");
    for (const w of ALL_WORDS) expect(r.out).toContain(w);
    for (const o of [
      "--days",
      "--org",
      "--json",
      "--limit",
      "--trigger",
      "--body-json",
      "--prompt",
      "--yes",
      ...ORG_OPTS,
    ])
      expect(r.out).toContain(o);
  });

  test("zsh は #compdef のスクリプトを出す", async () => {
    const r = await runCli(sb, ["completion", "zsh"]);
    expect(r.code).toBe(0);
    expect(r.err).toBe("");
    expect(r.out).toContain("#compdef devin-cli");
    expect(r.out).toContain("_describe");
    for (const w of ALL_WORDS) expect(r.out).toContain(w);
    for (const o of [
      "--days",
      "--org",
      "--json",
      "--limit",
      "--trigger",
      "--body-json",
      "--prompt",
      "--yes",
      ...ORG_OPTS,
    ])
      expect(r.out).toContain(o);
  });

  test("fish は complete -c のスクリプトを出す", async () => {
    const r = await runCli(sb, ["completion", "fish"]);
    expect(r.code).toBe(0);
    expect(r.err).toBe("");
    expect(r.out).toContain("complete -c devin-cli");
    for (const w of ALL_WORDS) expect(r.out).toContain(w);
    // fish は長いオプションを -l <名前> で書く
    for (const o of [
      "-l days",
      "-l org",
      "-l json",
      "-l limit",
      "-l trigger",
      "-l body-json",
      "-l prompt",
      "-l yes",
      "-l commit-sha",
      "-l out",
      "-l macro",
      "-l include-enterprise",
      "-l enforcement-level",
      "-l outpost-pool-id",
      "-l clear",
    ])
      expect(r.out).toContain(o);
  });

  test("対応しないシェル名は exit 2", async () => {
    const r = await runCli(sb, ["completion", "tcsh"]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("tcsh");
  });

  test("シェル名なしも exit 2", async () => {
    const r = await runCli(sb, ["completion"]);
    expect(r.code).toBe(2);
  });
});
