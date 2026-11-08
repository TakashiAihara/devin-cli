#!/usr/bin/env bun
// docs.devin.ai の v3 API リファレンス各ページに埋め込まれた
// ````yaml v3-openapi.yaml <METHOD> <PATH> フェンスを集めて openapi/devin-v3.yaml を生成する。
// 使い方: bun run sync:openapi
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parse, stringify } from "yaml";

export const INDEX_URL = "https://docs.devin.ai/_llms/en/api.txt";
export const OUTPUT_PATH = "openapi/devin-v3.yaml";
export const MIN_PATHS = 50;
const CONCURRENCY = 8;
const SERVER_URL = "https://api.devin.ai";

export function collectUrls(index: string): string[] {
  const urls = new Set<string>();
  for (const m of index.matchAll(
    /^- \[[^\]]*\]\((https:\/\/docs\.devin\.ai\/api-reference\/v3\/[^)\s]+\.md)\)/gm,
  )) {
    urls.add(m[1] as string);
  }
  return [...urls];
}

export type Fragment = { method: string; path: string; doc: Record<string, unknown> };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// フェンス行は ````yaml v3-openapi.yaml GET /v3/self のように method と path が続く。
// 1 ページに複数フェンスがあり得るので全て拾って返す。閉じフェンスは ```` (4 つ以上のバッククォート)
export function extractFragments(markdown: string): Fragment[] {
  const lines = markdown.split("\n");
  const frags: Fragment[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^`{4,}yaml v3-openapi\.yaml[ \t]+([A-Za-z]+)[ \t]+(\S+?)\s*$/.exec(lines[i] ?? "");
    if (!m) continue;
    const body: string[] = [];
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j] ?? "";
      if (/^`{4,}\s*$/.test(line)) {
        end = j;
        break;
      }
      body.push(line);
    }
    const parsed: unknown = parse(body.join("\n"));
    const doc: Record<string, unknown> = isRecord(parsed) ? parsed : {};
    frags.push({ method: (m[1] as string).toUpperCase(), path: m[2] as string, doc });
    i = end; // 閉じフェンスの次の行から探し直す (end === lines.length なら走査終了)
  }
  return frags;
}

// キー順を正規化した JSON。fragment 間の「同じ内容か」の比較に使う
function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .toSorted()
    .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
    .join(",")}}`;
}

export type MergedSpec = {
  paths: Record<string, Record<string, unknown>>;
  // components を section 名で generic に保持する。値は通常 name → 定義 の map で、
  // map でないセクション値 (x- 拡張のスカラー等) は生の値のまま入る
  components: Record<string, unknown>;
};

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options", "trace"]);

// components の 1 セクションをマージする。値が name → 定義 の map ならエントリ単位、
// そうでなければセクション単位で、dedupe + 内容不一致 throw (schemas と同じ方針)
function mergeComponentSection(
  components: Record<string, unknown>,
  section: string,
  value: unknown,
): void {
  const prev = components[section];
  if (isRecord(prev) && isRecord(value)) {
    for (const [name, def] of Object.entries(value)) {
      const p = prev[name];
      if (p !== undefined) {
        if (canonical(p) !== canonical(def))
          throw new Error(`components.${section}.${name} が fragment 間で内容不一致`);
        continue;
      }
      prev[name] = def;
    }
    return;
  }
  if (prev !== undefined) {
    if (canonical(prev) !== canonical(value))
      throw new Error(`components.${section} が fragment 間で内容不一致`);
    return;
  }
  components[section] = isRecord(value) ? { ...value } : value;
}

export function mergeFragments(frags: Fragment[]): MergedSpec {
  const paths: MergedSpec["paths"] = {};
  const components: MergedSpec["components"] = {};

  for (const frag of frags) {
    const fragPaths = frag.doc.paths;
    if (isRecord(fragPaths)) {
      for (const [p, item] of Object.entries(fragPaths)) {
        if (!isRecord(item)) throw new Error(`paths.${p} が Path Item Object でない`);
        const target = (paths[p] ??= {});
        for (const [key, op] of Object.entries(item)) {
          // HTTP method は小文字に正規化。parameters / summary / $ref 等の非 method キーも
          // method と同じ dedupe + 内容不一致 throw の方針でマージする
          const mergedKey = HTTP_METHODS.has(key.toLowerCase()) ? key.toLowerCase() : key;
          const prev = target[mergedKey];
          if (prev !== undefined) {
            if (canonical(prev) !== canonical(op))
              throw new Error(`paths ${p} ${key} が fragment 間で内容不一致`);
            continue; // 完全一致なら dedupe
          }
          target[mergedKey] = op;
        }
      }
    }
    const fragComponents = frag.doc.components;
    if (isRecord(fragComponents)) {
      for (const [section, value] of Object.entries(fragComponents)) {
        mergeComponentSection(components, section, value);
      }
    }
  }
  return { paths, components };
}

const pascal = (s: string) =>
  s
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

// GET /v3/organizations/{org_id}/consumption/daily → getOrganizationsOrgIdConsumptionDaily
export function normalizeOperationId(method: string, path: string): string {
  const segs = path
    .replace(/^\/v3\//, "")
    .split("/")
    .filter(Boolean)
    .map((seg) => {
      const inner = /^\{(.+)\}$/.exec(seg)?.[1];
      return pascal(inner ?? seg);
    });
  return method.toLowerCase() + segs.join("");
}

const sortKeys = <T>(o: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(o).toSorted(([a], [b]) => a.localeCompare(b)));

export function buildDocument(merged: MergedSpec): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  const seen = new Map<string, string>();
  for (const [p, item] of Object.entries(sortKeys(merged.paths))) {
    const pathItem: Record<string, unknown> = {};
    for (const [key, op] of Object.entries(item)) {
      // parameters / summary / $ref / servers 等の非 method キーは operationId を付けずそのまま
      if (!HTTP_METHODS.has(key.toLowerCase())) {
        pathItem[key] = op;
        continue;
      }
      if (!isRecord(op)) throw new Error(`paths ${p} ${key} の operation が Object でない`);
      const opId = normalizeOperationId(key, p);
      const prev = seen.get(opId);
      if (prev !== undefined)
        throw new Error(`operationId ${opId} が重複: ${prev} と ${key.toUpperCase()} ${p}`);
      seen.set(opId, `${key.toUpperCase()} ${p}`);
      pathItem[key] = { ...op, operationId: opId };
    }
    paths[p] = pathItem;
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Devin API v3",
      version: "3.0.0",
      description: "Generated from docs.devin.ai v3 API reference by scripts/sync-openapi.ts",
    },
    servers: [{ url: SERVER_URL }],
    security: [{ bearerAuth: [] }],
    paths,
    components: Object.fromEntries(
      Object.entries(sortKeys(merged.components)).map(([section, value]) => [
        section,
        isRecord(value) ? sortKeys(value) : value,
      ]),
    ),
  };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

async function fetchPage(url: string): Promise<Fragment[]> {
  return extractFragments(await fetchText(url));
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i] as T);
      }
    }),
  );
  return out;
}

async function main(): Promise<void> {
  const index = await fetchText(INDEX_URL);
  const urls = collectUrls(index);
  if (urls.length === 0) {
    console.error(`${INDEX_URL} から v3 のページ URL を 1 件も取れなかった`);
    process.exit(1);
  }

  // ネットワーク失敗はリトライ 1 回。フェンスが無いページは skip（数と名前を出す）
  const results = await pool(urls, CONCURRENCY, async (url) => {
    try {
      return await fetchPage(url);
    } catch {
      await Bun.sleep(500);
      return fetchPage(url);
    }
  });

  const frags: Fragment[] = [];
  const skipped: string[] = [];
  results.forEach((pageFrags, i) => {
    if (pageFrags.length > 0) frags.push(...pageFrags);
    else skipped.push(urls[i] as string);
  });
  if (skipped.length > 0) {
    console.log(`skip (OpenAPI フェンス無し) ${skipped.length} ページ:`);
    for (const u of skipped) console.log(`  ${u}`);
  }
  if (frags.length === 0) {
    console.error("OpenAPI fragment を 1 件も抽出できなかった");
    process.exit(1);
  }

  const merged = mergeFragments(frags);
  const pathCount = Object.keys(merged.paths).length;
  if (pathCount < MIN_PATHS) {
    console.error(
      `抽出した path が ${pathCount} 件で閾値 ${MIN_PATHS} を下回った。docs の形が変わった可能性がある`,
    );
    process.exit(1);
  }

  const doc = buildDocument(merged);
  const yamlText = stringify(doc);
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, yamlText);
  const schemas = merged.components["schemas"];
  const schemaCount = isRecord(schemas) ? Object.keys(schemas).length : 0;
  console.log(
    `wrote ${OUTPUT_PATH}: ${urls.length} ページ中 ${frags.length} fragment, ${pathCount} paths, ${schemaCount} schemas`,
  );
}

if (import.meta.main) {
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
