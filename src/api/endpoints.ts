// 生成クライアント (src/generated/) への薄いアダプタ。
// Orval の関数名・シグネチャが変わっても commands/ は触らずに済むよう、ここに閉じ込める
import type { Window } from "../dates.ts";
import {
  deleteOrganizationsOrgIdRepositoriesIndexing as genDeleteIndexingBulk,
  deleteOrganizationsOrgIdRepositoriesRepositoryPathIndexingBranchesBranchName as genDeleteIndexingBranch,
  deleteOrganizationsOrgIdRepositoriesRepositoryPathIndexing as genDeleteIndexingRepo,
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
  getOrganizationsOrgIdRepositories as genListRepositories,
  getOrganizationsOrgIdRepositoriesIndexing as genListIndexing,
  getOrganizationsOrgIdRepositoriesRepositoryPathIndexing as genGetIndexingRepo,
  getSelf as genSelf,
  putOrganizationsOrgIdRepositoriesIndexing as genPutIndexingBulk,
  putOrganizationsOrgIdRepositoriesRepositoryPathIndexing as genPutIndexingRepo,
} from "../generated/index.ts";
import type {
  BulkIndexRepositoriesRequest,
  GetOrganizationsOrgIdRepositoriesIndexingParams,
  GetOrganizationsOrgIdRepositoriesParams,
  IndexRepositoryRequest,
  RemoveRepositoriesRequest,
} from "../generated/api.schemas.ts";

export type SelfResponse = Awaited<ReturnType<typeof genSelf>>;
export type ConsumptionResponse = Awaited<ReturnType<typeof genConsumptionDaily>>;
export type UsageMetrics = Awaited<ReturnType<typeof genMetricsUsage>>;
export type SessionMetricsResponse = Awaited<ReturnType<typeof genMetricsSessions>>;
export type PrMetricsResponse = Awaited<ReturnType<typeof genMetricsPrs>>;
export type SearchMetricsResponse = Awaited<ReturnType<typeof genMetricsSearches>>;
export type ActiveUserMetricsList = Awaited<ReturnType<typeof genMetricsDau>>;
export type ActiveUserMetrics = Awaited<ReturnType<typeof genMetricsActiveUsers>>;
export type RepositoryListPage = Awaited<ReturnType<typeof genListRepositories>>;
export type RepositoryIndexingListPage = Awaited<ReturnType<typeof genListIndexing>>;
export type RepoIndexingStatus = Awaited<ReturnType<typeof genGetIndexingRepo>>;
export type RepositoryIndexing = Awaited<ReturnType<typeof genPutIndexingRepo>>;

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

// cursor pagination ({items, end_cursor, has_next_page, total} + after/first) を
// limit 件まで辿って 1 つの page 形に畳む。limit 省略時は has_next_page が尽きるまで全ページ取得。
// first は API 側の上限 (maxFirst) を超えないよう呼び出し側が決める
export type Page<T> = {
  items: T[];
  end_cursor?: string | null;
  has_next_page?: boolean;
  total?: number | null;
};

export async function collectPages<T>(
  maxFirst: number,
  limit: number | undefined,
  fetchPage: (after: string | undefined, first: number) => Promise<Page<T>>,
): Promise<Page<T>> {
  const items: T[] = [];
  let after: string | undefined;
  let total: number | null | undefined;
  let endCursor: string | null | undefined;
  let hasNext = false;
  // limit 到達までは残り件数を remaining で追う。undefined は無制限
  let remaining = limit;
  while (remaining === undefined || remaining > 0) {
    const first = remaining === undefined ? maxFirst : Math.min(maxFirst, remaining);
    const page = await fetchPage(after, first);
    const got = page.items ?? [];
    items.push(...got);
    total ??= page.total ?? undefined;
    hasNext = page.has_next_page === true;
    endCursor = page.end_cursor ?? null;
    // has_next_page が立っていても cursor が無い・0 件のページでは先に進めないので打ち切る
    if (!hasNext || !endCursor || got.length === 0) break;
    after = endCursor;
    remaining = limit === undefined ? undefined : limit - items.length;
  }
  return { items, end_cursor: endCursor ?? null, has_next_page: hasNext, total: total ?? null };
}

// --- repositories (org scope) ---
// repository_path は "org/repo" のようなパスなので encodeURIComponent 必須 (スラッシュも %2F になる)

export const listRepositories = (orgId: string, params?: GetOrganizationsOrgIdRepositoriesParams) =>
  genListRepositories(enc(orgId), params);

export const listIndexedRepositories = (
  orgId: string,
  params?: GetOrganizationsOrgIdRepositoriesIndexingParams,
) => genListIndexing(enc(orgId), params);

export const indexRepositoriesBulk = (orgId: string, body: BulkIndexRepositoriesRequest) =>
  genPutIndexingBulk(enc(orgId), body);

export const unindexRepositoriesBulk = (orgId: string, body: RemoveRepositoriesRequest) =>
  genDeleteIndexingBulk(enc(orgId), body);

export const getRepoIndexing = (orgId: string, repositoryPath: string) =>
  genGetIndexingRepo(enc(orgId), enc(repositoryPath));

export const indexRepository = (
  orgId: string,
  repositoryPath: string,
  body: IndexRepositoryRequest,
) => genPutIndexingRepo(enc(orgId), enc(repositoryPath), body);

export const unindexRepository = (orgId: string, repositoryPath: string) =>
  genDeleteIndexingRepo(enc(orgId), enc(repositoryPath));

export const unindexRepositoryBranch = (
  orgId: string,
  repositoryPath: string,
  branchName: string,
) => genDeleteIndexingBranch(enc(orgId), enc(repositoryPath), enc(branchName));
