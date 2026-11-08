// 生成クライアント (src/generated/) への薄いアダプタ。
// Orval の関数名・シグネチャが変わっても commands/ は触らずに済むよう、ここに閉じ込める
import type { Window } from "../dates.ts";
import {
  getOrganizationsOrgIdConsumptionDaily as genConsumptionDaily,
  getOrganizationsOrgIdConsumptionDailyServiceUsersServiceUserId as genConsumptionDailyServiceUser,
  getOrganizationsOrgIdConsumptionDailySessionsSessionId as genConsumptionDailySession,
  getOrganizationsOrgIdConsumptionDailyUsersUserId as genConsumptionDailyUser,
  getOrganizationsOrgIdMetricsActiveUsers as genMetricsActiveUsers,
  getOrganizationsOrgIdMetricsDau as genMetricsDau,
  getOrganizationsOrgIdMetricsMau as genMetricsMau,
  getOrganizationsOrgIdMetricsPrs as genMetricsPrs,
  getOrganizationsOrgIdMetricsSearches as genMetricsSearches,
  getOrganizationsOrgIdMetricsSessions as genMetricsSessions,
  getOrganizationsOrgIdMetricsUsage as genMetricsUsage,
  getOrganizationsOrgIdMetricsWau as genMetricsWau,
  getSelf as genSelf,
} from "../generated/index.ts";

export type SelfResponse = Awaited<ReturnType<typeof genSelf>>;
export type ConsumptionResponse = Awaited<ReturnType<typeof genConsumptionDaily>>;
export type UsageMetrics = Awaited<ReturnType<typeof genMetricsUsage>>;
export type SessionMetricsResponse = Awaited<ReturnType<typeof genMetricsSessions>>;
export type PrMetricsResponse = Awaited<ReturnType<typeof genMetricsPrs>>;
export type SearchMetricsResponse = Awaited<ReturnType<typeof genMetricsSearches>>;
export type ActiveUserMetricsList = Awaited<ReturnType<typeof genMetricsDau>>;
export type ActiveUserMetrics = Awaited<ReturnType<typeof genMetricsActiveUsers>>;

const w = (win: Window) => ({ time_after: win.time_after, time_before: win.time_before });
// 生成コードは path param を素で埋め込むので、こちらで encode して `..` や `?` による
// path の書き換え・query 化を防ぐ (encode しても通常の ID は変化しない)
const enc = encodeURIComponent;

export const apiSelf = () => genSelf();
export const consumptionDaily = (orgId: string, win: Window) =>
  genConsumptionDaily(enc(orgId), w(win));
export const consumptionDailyUser = (orgId: string, userId: string, win: Window) =>
  genConsumptionDailyUser(enc(orgId), enc(userId), w(win));
export const consumptionDailyServiceUser = (orgId: string, serviceUserId: string, win: Window) =>
  genConsumptionDailyServiceUser(enc(orgId), enc(serviceUserId), w(win));
export const consumptionDailySession = (orgId: string, sessionId: string, win: Window) =>
  genConsumptionDailySession(enc(orgId), enc(sessionId), w(win));
export const metricsUsage = (orgId: string, win: Window) => genMetricsUsage(enc(orgId), w(win));
export const metricsSessions = (orgId: string, win: Window) =>
  genMetricsSessions(enc(orgId), w(win));
export const metricsPrs = (orgId: string, win: Window) => genMetricsPrs(enc(orgId), w(win));
export const metricsSearches = (orgId: string, win: Window) =>
  genMetricsSearches(enc(orgId), w(win));
export const metricsDau = (orgId: string, win: Window) => genMetricsDau(enc(orgId), w(win));
export const metricsWau = (orgId: string, win: Window) => genMetricsWau(enc(orgId), w(win));
export const metricsMau = (orgId: string, win: Window) => genMetricsMau(enc(orgId), w(win));
export const metricsActiveUsers = (orgId: string, win: Window) =>
  genMetricsActiveUsers(enc(orgId), w(win));
