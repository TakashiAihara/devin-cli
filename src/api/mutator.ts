import { API_KEY, apiBaseUrl, apiTimeoutMs, ExitError, secret, send, sendBytes } from "../lib.ts";

// Orval が渡す URL を絶対 URL に正規化する。
// 相対 path (/v3/self 等) なら apiBaseUrl() を前置し、絶対 URL なら origin を apiBaseUrl() に差し替える
function absoluteUrl(url: string): string {
  const base = apiBaseUrl();
  if (/^https?:\/\//.test(url)) {
    const u = new URL(url);
    return `${base}${u.pathname}${u.search}`;
  }
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function problemDetail(raw: string, status: number, statusText: string): string {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    for (const k of ["detail", "title"] as const) {
      const v = o?.[k];
      if (typeof v === "string" && v) return v;
    }
  } catch {
    // JSON でない body は statusText に倒す
  }
  return statusText || `HTTP ${status}`;
}

// apiFetch / apiRaw 共通の認証ヘッダ。前後の空白は落とし、
// ヘッダ値に使えない文字を含む値は値を出さずに拒否する
async function authHeaders(h?: HeadersInit): Promise<Headers> {
  const headers = new Headers(h);
  const token = (await secret(API_KEY)).trim();
  if (!token) throw new ExitError(`${API_KEY} が空か空白だけ`, 2);
  if (!/^[!-~]+$/.test(token))
    throw new ExitError(`${API_KEY} の値を HTTP ヘッダに使えない文字が含まれる`, 2);
  headers.set("authorization", `Bearer ${token}`);
  return headers;
}

function throwForStatus(raw: string, status: number, statusText: string): void {
  const detail = problemDetail(raw, status, statusText);
  if (status === 401)
    throw new ExitError(`Devin API が HTTP 401 を返した: ${detail} (DEVIN_API_KEY を確認する)`, 2);
  throw new ExitError(`Devin API が HTTP ${status} を返した: ${detail}`, 1);
}

// Orval fetch client の custom mutator。includeHttpResponseReturnType: false に合わせて
// 成功時はデータ本体を返し、エラーは ExitError として throw する
export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await send(
    absoluteUrl(url),
    { ...options, headers: await authHeaders(options.headers) },
    apiTimeoutMs(),
  );
  if (!res.ok) throwForStatus(res.raw, res.status, res.statusText);
  // 204/205 は仕様上 body を持たない (security-profiles の DELETE 等)。undefined を返す
  if (res.raw === "") {
    if (res.status === 204 || res.status === 205) return undefined as T;
    throw new ExitError(`Devin API が空の応答を返した (HTTP ${res.status})`, 70);
  }
  try {
    return JSON.parse(res.raw) as T;
  } catch {
    throw new ExitError(`Devin API の応答を JSON として読めない (HTTP ${res.status})`, 70);
  }
}

export type ApiRawReply = { status: number; headers: Headers; bytes: Uint8Array };

// apiFetch のバイナリ版。JSON parse せず status/headers/body をそのまま返す。
// attachment download のように 307 redirect を自分で解釈したい呼び出し用に、
// redirect: "manual" で投げたとき 3xx はエラーにせず返す (Location の解釈は呼び出し側)
export async function apiRaw(url: string, options: RequestInit = {}): Promise<ApiRawReply> {
  const res = await sendBytes(
    absoluteUrl(url),
    { ...options, headers: await authHeaders(options.headers) },
    apiTimeoutMs(),
  );
  const isRedirect = res.status >= 300 && res.status < 400;
  if (!res.ok && !isRedirect)
    throwForStatus(new TextDecoder().decode(res.bytes), res.status, res.statusText);
  return { status: res.status, headers: res.headers, bytes: res.bytes };
}
