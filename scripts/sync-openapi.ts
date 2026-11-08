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

// フェンス行は ````yaml v3-openapi.yaml GET /v3/self のように method と path が続く。
// 閉じフェンスは ```` (4 つ以上のバッククォート)
export function extractFragment(markdown: string): Fragment | null {
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = /^````yaml v3-openapi\.yaml[ \t]+([A-Za-z]+)[ \t]+(\S+?)\s*$/.exec(lines[i] ?? "");
    if (!m) continue;
    const body: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j] ?? "";
      if (/^`{4,}\s*$/.test(line)) break;
      body.push(line);
    }
    const doc = parse(body.join("\n")) as Record<string, unknown>;
    return { method: (m[1] as string).toUpperCase(), path: m[2] as string, doc };
  }
  return null;
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
  schemas: Record<string, unknown>;
  securitySchemes: Record<string, unknown>;
};

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options", "trace"]);

export function mergeFragments(frags: Fragment[]): MergedSpec {
  const paths: MergedSpec["paths"] = {};
  const schemas: MergedSpec["schemas"] = {};
  const securitySchemes: MergedSpec["securitySchemes"] = {};

  for (const frag of frags) {
    const fragPaths = (frag.doc.paths ?? {}) as Record<string, Record<string, unknown>>;
    for (const [p, item] of Object.entries(fragPaths)) {
      const target = (paths[p] ??= {});
      for (const [method, op] of Object.entries(item)) {
        if (!HTTP_METHODS.has(method.toLowerCase())) continue;
        const key = method.toLowerCase();
        const prev = target[key];
        if (prev !== undefined) {
          if (canonical(prev) !== canonical(op))
            throw new Error(`paths ${p} ${method} が fragment 間で内容不一致`);
          continue; // 完全一致なら dedupe
        }
        target[key] = op;
      }
    }
    const components = frag.doc.components as
      | { schemas?: Record<string, unknown>; securitySchemes?: Record<string, unknown> }
      | undefined;
    for (const [name, schema] of Object.entries(components?.schemas ?? {})) {
      const prev = schemas[name];
      if (prev !== undefined) {
        if (canonical(prev) !== canonical(schema))
          throw new Error(`components.schemas.${name} が fragment 間で内容不一致`);
        continue;
      }
      schemas[name] = schema;
    }
    for (const [name, scheme] of Object.entries(components?.securitySchemes ?? {})) {
      const prev = securitySchemes[name];
      if (prev !== undefined) {
        if (canonical(prev) !== canonical(scheme))
          throw new Error(`components.securitySchemes.${name} が fragment 間で内容不一致`);
        continue;
      }
      securitySchemes[name] = scheme;
    }
  }
  return { paths, schemas, securitySchemes };
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
    const methods: Record<string, unknown> = {};
    for (const [method, op] of Object.entries(item)) {
      const o = op as Record<string, unknown>;
      const opId = normalizeOperationId(method, p);
      const prev = seen.get(opId);
      if (prev !== undefined)
        throw new Error(`operationId ${opId} が重複: ${prev} と ${method.toUpperCase()} ${p}`);
      seen.set(opId, `${method.toUpperCase()} ${p}`);
      methods[method] = { ...o, operationId: opId };
    }
    paths[p] = methods;
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
    components: {
      schemas: sortKeys(merged.schemas),
      securitySchemes: sortKeys(merged.securitySchemes),
    },
  };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

async function fetchPage(url: string): Promise<Fragment | null> {
  return extractFragment(await fetchText(url));
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
  results.forEach((frag, i) => {
    if (frag) frags.push(frag);
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
  console.log(
    `wrote ${OUTPUT_PATH}: ${urls.length} ページ中 ${frags.length} fragment, ${pathCount} paths, ${Object.keys(merged.schemas).length} schemas`,
  );
}

if (import.meta.main) {
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
