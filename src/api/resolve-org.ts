import { die, orgIdConfig } from "../lib.ts";
import { apiSelf, type SelfResponse } from "./endpoints.ts";

// /v3/self は 1 プロセス 1 回まで（consumption user の user_id 解決と org 解決で共有する）
let cached: Promise<SelfResponse> | undefined;
export function selfInfo(): Promise<SelfResponse> {
  return (cached ??= apiSelf());
}

// principal_type ごとの org ID 優先順位:
//   pat_user / windsurf_session: primary_billing_org_id → devin_sessions_org_id → org_id
//   service_user / devin_brain:  org_id
export function orgIdFromSelf(self: SelfResponse): string | undefined {
  const s = self as unknown as Record<string, unknown>;
  const pick = (...keys: string[]) =>
    keys.map((k) => s[k]).find((v): v is string => typeof v === "string" && v.length > 0);
  if (s.principal_type === "pat_user" || s.principal_type === "windsurf_session")
    return pick("primary_billing_org_id", "devin_sessions_org_id", "org_id");
  return pick("org_id");
}

// consumption user で user_id 省略時に使う。service_user には user_id が無い
export function userIdFromSelf(self: SelfResponse): string | undefined {
  const s = self as unknown as Record<string, unknown>;
  const v = s.user_id;
  return typeof v === "string" && v ? v : undefined;
}

export async function resolveOrgId(flag?: string): Promise<string> {
  if (flag) return flag;
  const env = process.env.DEVIN_ORG_ID;
  if (env) return env;
  const cfg = orgIdConfig();
  if (cfg) return cfg;
  const org = orgIdFromSelf(await selfInfo());
  if (org) return org;
  return die("org を解決できない。--org か DEVIN_ORG_ID か config の org_id を指定する", 2);
}
