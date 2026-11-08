// 生成クライアント (src/generated/) への薄いアダプタ。
// Orval の関数名・シグネチャが変わっても commands/ は触らずに済むよう、ここに閉じ込める
import type { Window } from "../dates.ts";
import {
  deleteOrganizationsOrgIdRepositoriesIndexing as genDeleteIndexingBulk,
  deleteOrganizationsOrgIdRepositoriesRepositoryPathIndexingBranchesBranchName as genDeleteIndexingBranch,
  deleteOrganizationsOrgIdRepositoriesRepositoryPathIndexing as genDeleteIndexingRepo,
  getOrganizationsOrgIdCodeScansFindings as genCodeScanFindings,
  getOrganizationsOrgIdCodeScansMetrics as genCodeScanMetrics,
  getOrganizationsOrgIdCodeScansProfiles as genCodeScanProfiles,
  getOrganizationsOrgIdCodeScansProfilesProfileId as genCodeScanProfile,
  getOrganizationsOrgIdCodeScansScans as genCodeScanScans,
  getOrganizationsOrgIdConsumptionDaily as genConsumptionDaily,
  getOrganizationsOrgIdSnapshotSetupBlueprints as genSnapshotBlueprints,
  getOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintId as genSnapshotBlueprint,
  getOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintIdContents as genSnapshotBlueprintContents,
  getOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintIdFiles as genSnapshotBlueprintFiles,
  getOrganizationsOrgIdSnapshotSetupBuilds as genSnapshotBuilds,
  getOrganizationsOrgIdSnapshotSetupBuildsBuildId as genSnapshotBuild,
  getOrganizationsOrgIdSnapshotSetupBuildsBuildIdLogs as genSnapshotBuildLogs,
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
  deleteOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintId as genSnapshotBlueprintDelete,
  deleteOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintIdFilesFileId as genSnapshotBlueprintFileDelete,
  deleteOrganizationsOrgIdSnapshotSetupBuildsBuildIdPin as genSnapshotBuildUnpin,
  patchOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintId as genSnapshotBlueprintUpdate,
  postOrganizationsOrgIdSnapshotSetupBlueprints as genSnapshotBlueprintCreate,
  postOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintIdFiles as genSnapshotBlueprintFileUpload,
  postOrganizationsOrgIdSnapshotSetupBuilds as genSnapshotBuildTrigger,
  postOrganizationsOrgIdSnapshotSetupBuildsBuildIdCancel as genSnapshotBuildCancel,
  postOrganizationsOrgIdSnapshotSetupBuildsBuildIdPin as genSnapshotBuildPin,
  putOrganizationsOrgIdRepositoriesIndexing as genPutIndexingBulk,
  putOrganizationsOrgIdRepositoriesRepositoryPathIndexing as genPutIndexingRepo,
} from "../generated/index.ts";
import type {
  BulkIndexRepositoriesRequest,
  CreateOrgBlueprintBody,
  GetOrganizationsOrgIdCodeScansFindingsParams,
  GetOrganizationsOrgIdCodeScansMetricsParams,
  GetOrganizationsOrgIdCodeScansProfilesParams,
  GetOrganizationsOrgIdCodeScansScansParams,
  GetOrganizationsOrgIdRepositoriesIndexingParams,
  GetOrganizationsOrgIdRepositoriesParams,
  GetOrganizationsOrgIdSnapshotSetupBlueprintsParams,
  GetOrganizationsOrgIdSnapshotSetupBuildsParams,
  IndexRepositoryRequest,
  PinBuildBody,
  RemoveRepositoriesRequest,
  TriggerBuildBody,
  UpdateOrgBlueprintBody,
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
export type CodeScanFindingPage = Awaited<ReturnType<typeof genCodeScanFindings>>;
export type CodeScanMetrics = Awaited<ReturnType<typeof genCodeScanMetrics>>;
export type CodeScanPage = Awaited<ReturnType<typeof genCodeScanScans>>;
export type CodeScanProfilePage = Awaited<ReturnType<typeof genCodeScanProfiles>>;
export type CodeScanProfileDetail = Awaited<ReturnType<typeof genCodeScanProfile>>;
export type SnapshotBlueprintList = Awaited<ReturnType<typeof genSnapshotBlueprints>>;
export type SnapshotBlueprint = Awaited<ReturnType<typeof genSnapshotBlueprint>>;
export type SnapshotPresignedDownload = Awaited<ReturnType<typeof genSnapshotBlueprintContents>>;
export type SnapshotBlueprintFileList = Awaited<ReturnType<typeof genSnapshotBlueprintFiles>>;
export type SnapshotBlueprintFile = Awaited<ReturnType<typeof genSnapshotBlueprintFileUpload>>;
export type SnapshotBuildPage = Awaited<ReturnType<typeof genSnapshotBuilds>>;
export type SnapshotBuild = Awaited<ReturnType<typeof genSnapshotBuild>>;

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

// --- code-scans (org scope、read のみ。scan 作成 / ingestion / remediate は write 系なので未実装) ---

export const codeScanFindings = (
  orgId: string,
  params?: GetOrganizationsOrgIdCodeScansFindingsParams,
) => genCodeScanFindings(enc(orgId), params);

export const codeScanMetrics = (
  orgId: string,
  params: GetOrganizationsOrgIdCodeScansMetricsParams,
) => genCodeScanMetrics(enc(orgId), params);

export const codeScanScans = (orgId: string, params?: GetOrganizationsOrgIdCodeScansScansParams) =>
  genCodeScanScans(enc(orgId), params);

export const codeScanProfiles = (
  orgId: string,
  params?: GetOrganizationsOrgIdCodeScansProfilesParams,
) => genCodeScanProfiles(enc(orgId), params);

export const codeScanProfile = (orgId: string, profileId: string) =>
  genCodeScanProfile(enc(orgId), enc(profileId));

// --- snapshot-setup (org scope) ---
// BlueprintList / BlueprintFileList / PaginatedResponse_Build_ は items ではなく data/items の
// envelope なので、commands 側で形を確認してから使う

export const snapshotBlueprints = (
  orgId: string,
  params?: GetOrganizationsOrgIdSnapshotSetupBlueprintsParams,
) => genSnapshotBlueprints(enc(orgId), params);

export const snapshotBlueprintCreate = (orgId: string, body: CreateOrgBlueprintBody) =>
  genSnapshotBlueprintCreate(enc(orgId), body);

export const snapshotBlueprint = (orgId: string, blueprintId: string) =>
  genSnapshotBlueprint(enc(orgId), enc(blueprintId));

export const snapshotBlueprintUpdate = (
  orgId: string,
  blueprintId: string,
  body: UpdateOrgBlueprintBody,
) => genSnapshotBlueprintUpdate(enc(orgId), enc(blueprintId), body);

export const snapshotBlueprintDelete = (orgId: string, blueprintId: string) =>
  genSnapshotBlueprintDelete(enc(orgId), enc(blueprintId));

export const snapshotBlueprintContents = (orgId: string, blueprintId: string) =>
  genSnapshotBlueprintContents(enc(orgId), enc(blueprintId));

export const snapshotBlueprintFiles = (orgId: string, blueprintId: string) =>
  genSnapshotBlueprintFiles(enc(orgId), enc(blueprintId));

// files の POST は multipart/form-data。name は query param (必須)
export const snapshotBlueprintFileUpload = (
  orgId: string,
  blueprintId: string,
  file: Blob,
  name: string,
) => genSnapshotBlueprintFileUpload(enc(orgId), enc(blueprintId), { file }, { name });

export const snapshotBlueprintFileDelete = (orgId: string, blueprintId: string, fileId: string) =>
  genSnapshotBlueprintFileDelete(enc(orgId), enc(blueprintId), enc(fileId));

export const snapshotBuilds = (
  orgId: string,
  params?: GetOrganizationsOrgIdSnapshotSetupBuildsParams,
) => genSnapshotBuilds(enc(orgId), params);

export const snapshotBuildTrigger = (orgId: string, body: TriggerBuildBody) =>
  genSnapshotBuildTrigger(enc(orgId), body);

export const snapshotBuild = (orgId: string, buildId: string) =>
  genSnapshotBuild(enc(orgId), enc(buildId));

export const snapshotBuildLogs = (orgId: string, buildId: string) =>
  genSnapshotBuildLogs(enc(orgId), enc(buildId));

export const snapshotBuildCancel = (orgId: string, buildId: string) =>
  genSnapshotBuildCancel(enc(orgId), enc(buildId));

export const snapshotBuildPin = (orgId: string, buildId: string, body: PinBuildBody) =>
  genSnapshotBuildPin(enc(orgId), enc(buildId), body);

export const snapshotBuildUnpin = (orgId: string, buildId: string) =>
  genSnapshotBuildUnpin(enc(orgId), enc(buildId));
