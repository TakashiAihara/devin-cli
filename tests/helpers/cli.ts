import { afterEach, beforeEach, setDefaultTimeout } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { API_KEY, startFake, type Fake, type FakeOptions } from "./fake-devin.ts";

setDefaultTimeout(30_000);

const CLI = resolve(import.meta.dir, "../../src/cli.ts");
const HANG_LIMIT_MS = 20_000;

export type Env = Record<string, string | undefined>;
export type Ran = { code: number; out: string; err: string };
export type Sandbox = { dir: string; home: string; xdg: string };

export function makeSandbox(): Sandbox {
  const dir = mkdtempSync(join(tmpdir(), "devin-cli-test-"));
  const home = join(dir, "home");
  const xdg = join(dir, "xdg");
  mkdirSync(home);
  mkdirSync(xdg);
  return { dir, home, xdg };
}

export function removeSandbox(sb: Sandbox): void {
  rmSync(sb.dir, { recursive: true, force: true });
}

// 本物の DEVIN_* や利用者の設定ファイルが紛れ込まないよう、env は親から引き継がず組み直す
function cliEnv(sb: Sandbox, env: Env): Record<string, string> {
  const base: Env = { PATH: process.env.PATH, HOME: sb.home, XDG_CONFIG_HOME: sb.xdg };
  const merged = { ...base, ...env };
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined) clean[k] = v;
  }
  return clean;
}

export function startCli(sb: Sandbox, args: string[], env: Env = {}) {
  return Bun.spawn([process.execPath, CLI, ...args], {
    cwd: sb.dir,
    env: cliEnv(sb, env),
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
}

export async function finishCli(proc: ReturnType<typeof startCli>): Promise<Ran> {
  const killer = setTimeout(() => proc.kill(), HANG_LIMIT_MS);
  try {
    const [out, err, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { code, out, err };
  } finally {
    clearTimeout(killer);
  }
}

export async function runCli(sb: Sandbox, args: string[], env: Env = {}): Promise<Ran> {
  return finishCli(startCli(sb, args, env));
}

export type Ctx = {
  sb: Sandbox;
  fake: Fake;
  // DEVIN_API_BASE_URL / DEVIN_API_KEY を env で渡した状態で起動する。undefined を渡した項目は外す
  run: (args: string[], env?: Env) => Promise<Ran>;
};

export function useFake(options: FakeOptions = {}): Ctx {
  const ctx = {} as Ctx;
  beforeEach(() => {
    ctx.sb = makeSandbox();
    ctx.fake = startFake(options);
    ctx.run = (args, env = {}) =>
      runCli(ctx.sb, args, {
        DEVIN_API_BASE_URL: ctx.fake.url,
        DEVIN_API_KEY: API_KEY,
        ...env,
      });
  });
  afterEach(() => {
    ctx.fake.stop();
    removeSandbox(ctx.sb);
  });
  return ctx;
}

export function writeConfig(sb: Sandbox, toml: string): string {
  const dir = join(sb.xdg, "devin-cli");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "config.toml");
  writeFileSync(file, toml);
  return file;
}

export const tsv = (...lines: string[]) => `${lines.join("\n")}\n`;
