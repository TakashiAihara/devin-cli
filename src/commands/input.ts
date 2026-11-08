// create/update 系コマンドで共通の入力ヘルパー。
// --body-json <json> / --body-file <path> ("-" で stdin) / --body-file-text 系をまとめて扱う
import { readFileSync } from "node:fs";
import { die } from "../lib.ts";

// ファイル (または "-" = stdin) から文字列を読む
export function readInputFile(path: string, flag: string): string {
  try {
    return path === "-" ? readFileSync(0, "utf8") : readFileSync(path, "utf8");
  } catch (e) {
    return die(`${flag} を読めない: ${(e as Error).message}`, 2);
  }
}

// --body-json / --body-file で渡される JSON object を読む。どちらも無ければ undefined。
// 中身は呼び出し側で API のリクエスト型にキャストする (API が最終的な検証者)
export function jsonBody(opts: { bodyJson?: string; bodyFile?: string }): Record<string, unknown> {
  if (opts.bodyJson !== undefined && opts.bodyFile !== undefined)
    die("--body-json と --body-file は同時に指定できない", 2);
  let raw: string;
  if (opts.bodyJson !== undefined) raw = opts.bodyJson;
  else if (opts.bodyFile !== undefined) raw = readInputFile(opts.bodyFile, "--body-file");
  else return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return die(`--body-json/--body-file の JSON を読めない: ${(e as Error).message}`, 2);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    die("--body-json/--body-file の中身は JSON オブジェクト ({...}) にする", 2);
  return parsed as Record<string, unknown>;
}

// jsonBody が値を持つか (どちらのフラグも無い = 空オブジェクト)
export const hasJsonBody = (opts: { bodyJson?: string; bodyFile?: string }): boolean =>
  opts.bodyJson !== undefined || opts.bodyFile !== undefined;
