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

export const apiSelf = () => genSelf();
export const consumptionDaily = (orgId: string, win: Window) => genConsumptionDaily(orgId, w(win));
export const consumptionDailyUser = (orgId: string, userId: string, win: Window) =>
  genConsumptionDailyUser(orgId, userId, w(win));
export const consumptionDailyServiceUser = (orgId: string, serviceUserId: string, win: Window) =>
  genConsumptionDailyServiceUser(orgId, serviceUserId, w(win));
export const consumptionDailySession = (orgId: string, sessionId: string, win: Window) =>
  genConsumptionDailySession(orgId, sessionId, w(win));
export const metricsUsage = (orgId: string, win: Window) => genMetricsUsage(orgId, w(win));
export const metricsSessions = (orgId: string, win: Window) => genMetricsSessions(orgId, w(win));
export const metricsPrs = (orgId: string, win: Window) => genMetricsPrs(orgId, w(win));
export const metricsSearches = (orgId: string, win: Window) => genMetricsSearches(orgId, w(win));
export const metricsDau = (orgId: string, win: Window) => genMetricsDau(orgId, w(win));
export const metricsWau = (orgId: string, win: Window) => genMetricsWau(orgId, w(win));
export const metricsMau = (orgId: string, win: Window) => genMetricsMau(orgId, w(win));
export const metricsActiveUsers = (orgId: string, win: Window) =>
  genMetricsActiveUsers(orgId, w(win));
