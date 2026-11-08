import { API_KEY, apiBaseUrl, apiTimeoutMs, ExitError, secret, send } from "../lib.ts";

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

// Orval fetch client の custom mutator。includeHttpResponseReturnType: false に合わせて
// 成功時はデータ本体を返し、エラーは ExitError として throw する
export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("authorization", `Bearer ${await secret(API_KEY)}`);
  const res = await send(absoluteUrl(url), { ...options, headers }, apiTimeoutMs());
  if (!res.ok) {
    const detail = problemDetail(res.raw, res.status, res.statusText);
    if (res.status === 401)
      throw new ExitError(
        `Devin API が HTTP 401 を返した: ${detail} (DEVIN_API_KEY を確認する)`,
        2,
      );
    throw new ExitError(`Devin API が HTTP ${res.status} を返した: ${detail}`, 1);
  }
  if (res.raw === "") return undefined as T;
  try {
    return JSON.parse(res.raw) as T;
  } catch {
    throw new ExitError(`Devin API の応答を JSON として読めない (HTTP ${res.status})`, 70);
  }
}
