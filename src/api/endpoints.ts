// 生成クライアント (src/generated/) への薄いアダプタ。
// Orval の関数名・シグネチャが変わっても commands/ は触らずに済むよう、ここに閉じ込める
import type {
  DeleteOrganizationsOrgIdSessionsDevinIdParams,
  GetOrganizationsOrgIdSessionsDevinIdMessagesParams,
  GetOrganizationsOrgIdSessionsParams,
  SessionCreateRequest,
  SessionTagsUpdateRequest,
} from "../generated/api.schemas.ts";
import type { Window } from "../dates.ts";
import {
  deleteOrganizationsOrgIdAutomationsAutomationId as genDeleteAutomation,
  deleteOrganizationsOrgIdKnowledgeNotesNoteId as genDeleteKnowledgeNote,
  deleteOrganizationsOrgIdRepositoriesIndexing as genDeleteIndexingBulk,
  deleteOrganizationsOrgIdRepositoriesRepositoryPathIndexing as genDeleteIndexingRepo,
  deleteOrganizationsOrgIdRepositoriesRepositoryPathIndexingBranchesBranchName as genDeleteIndexingBranch,
  deleteOrganizationsOrgIdSchedulesScheduleId as genDeleteSchedule,
  deleteOrganizationsOrgIdSessionsDevinId as genSessionDelete,
  deleteOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintId as genSnapshotBlueprintDelete,
  deleteOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintIdFilesFileId as genSnapshotBlueprintFileDelete,
  deleteOrganizationsOrgIdSnapshotSetupBuildsBuildIdPin as genSnapshotBuildUnpin,
  getOrganizationsOrgIdAutomations as genAutomations,
  getOrganizationsOrgIdAutomationsAutomationId as genAutomation,
  getOrganizationsOrgIdAutomationsSchemas as genAutomationSchemas,
  getOrganizationsOrgIdAutomationsTemplates as genAutomationTemplates,
  getOrganizationsOrgIdCodeScansFindings as genCodeScanFindings,
  getOrganizationsOrgIdCodeScansMetrics as genCodeScanMetrics,
  getOrganizationsOrgIdCodeScansProfiles as genCodeScanProfiles,
  getOrganizationsOrgIdCodeScansProfilesProfileId as genCodeScanProfile,
  getOrganizationsOrgIdCodeScansScans as genCodeScanScans,
  getOrganizationsOrgIdConsumptionDaily as genConsumptionDaily,
  getOrganizationsOrgIdConsumptionDailyServiceUsersServiceUserId as genConsumptionDailyServiceUser,
  getOrganizationsOrgIdConsumptionDailySessionsSessionId as genConsumptionDailySession,
  getOrganizationsOrgIdConsumptionDailyUsersUserId as genConsumptionDailyUser,
  getOrganizationsOrgIdKnowledgeFolders as genKnowledgeFolders,
  getOrganizationsOrgIdKnowledgeNotes as genKnowledgeNotes,
  getOrganizationsOrgIdKnowledgeNotesNoteId as genKnowledgeNote,
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
  getOrganizationsOrgIdSchedules as genSchedules,
  getOrganizationsOrgIdSchedulesScheduleId as genSchedule,
  getOrganizationsOrgIdSessions as genSessionsList,
  getOrganizationsOrgIdSessionsDevinId as genSessionGet,
  getOrganizationsOrgIdSessionsDevinIdAttachments as genSessionAttachments,
  getOrganizationsOrgIdSessionsDevinIdInsights as genSessionInsights,
  getOrganizationsOrgIdSessionsDevinIdMessages as genSessionMessages,
  getOrganizationsOrgIdSessionsDevinIdTags as genSessionTagsGet,
  getOrganizationsOrgIdSessionsInsights as genSessionsInsights,
  getOrganizationsOrgIdSnapshotSetupBlueprints as genSnapshotBlueprints,
  getOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintId as genSnapshotBlueprint,
  getOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintIdContents as genSnapshotBlueprintContents,
  getOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintIdFiles as genSnapshotBlueprintFiles,
  getOrganizationsOrgIdSnapshotSetupBuilds as genSnapshotBuilds,
  getOrganizationsOrgIdSnapshotSetupBuildsBuildId as genSnapshotBuild,
  getOrganizationsOrgIdSnapshotSetupBuildsBuildIdLogs as genSnapshotBuildLogs,
  getSelf as genSelf,
  patchOrganizationsOrgIdAutomationsAutomationId as genPatchAutomation,
  patchOrganizationsOrgIdSchedulesScheduleId as genPatchSchedule,
  patchOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintId as genSnapshotBlueprintUpdate,
  postOrganizationsOrgIdAutomations as genCreateAutomation,
  postOrganizationsOrgIdKnowledgeNotes as genCreateKnowledgeNote,
  postOrganizationsOrgIdSchedules as genCreateSchedule,
  postOrganizationsOrgIdSessions as genSessionCreate,
  postOrganizationsOrgIdSessionsDevinIdArchive as genSessionArchive,
  postOrganizationsOrgIdSessionsDevinIdTags as genSessionTagsAdd,
  postOrganizationsOrgIdSnapshotSetupBlueprints as genSnapshotBlueprintCreate,
  postOrganizationsOrgIdSnapshotSetupBlueprintsBlueprintIdFiles as genSnapshotBlueprintFileUpload,
  postOrganizationsOrgIdSnapshotSetupBuilds as genSnapshotBuildTrigger,
  postOrganizationsOrgIdSnapshotSetupBuildsBuildIdCancel as genSnapshotBuildCancel,
  postOrganizationsOrgIdSnapshotSetupBuildsBuildIdPin as genSnapshotBuildPin,
  putOrganizationsOrgIdKnowledgeNotesNoteId as genUpdateKnowledgeNote,
  putOrganizationsOrgIdRepositoriesIndexing as genPutIndexingBulk,
  putOrganizationsOrgIdRepositoriesRepositoryPathIndexing as genPutIndexingRepo,
  putOrganizationsOrgIdSessionsDevinIdTags as genSessionTagsSet,
} from "../generated/index.ts";
import type {
  AutomationCreateRequest,
  AutomationResponse,
  AutomationSchemasResponse,
  AutomationTemplatesResponse,
  AutomationUpdateRequest,
  BulkIndexRepositoriesRequest,
  CreateOrgBlueprintBody,
  FolderTreeResponse,
  GetOrganizationsOrgIdAutomationsParams,
  GetOrganizationsOrgIdAutomationsSchemasParams,
  GetOrganizationsOrgIdCodeScansFindingsParams,
  GetOrganizationsOrgIdCodeScansMetricsParams,
  GetOrganizationsOrgIdCodeScansProfilesParams,
  GetOrganizationsOrgIdCodeScansScansParams,
  GetOrganizationsOrgIdKnowledgeNotesParams,
  GetOrganizationsOrgIdRepositoriesIndexingParams,
  GetOrganizationsOrgIdRepositoriesParams,
  GetOrganizationsOrgIdSchedulesParams,
  GetOrganizationsOrgIdSnapshotSetupBlueprintsParams,
  GetOrganizationsOrgIdSnapshotSetupBuildsParams,
  IndexRepositoryRequest,
  KnowledgeNoteCreateRequest,
  KnowledgeNoteResponse,
  PaginatedResponseAutomationResponse,
  PaginatedResponseKnowledgeNoteResponse,
  PaginatedResponseScheduleResponse,
  PinBuildBody,
  RemoveRepositoriesRequest,
  ScheduleCreateRequest,
  ScheduleResponse,
  ScheduleUpdateRequest,
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
export type SessionResponse = Awaited<ReturnType<typeof genSessionGet>>;
export type SessionListResponse = Awaited<ReturnType<typeof genSessionsList>>;
export type SessionMessageListResponse = Awaited<ReturnType<typeof genSessionMessages>>;
export type SessionInsightsResponse = Awaited<ReturnType<typeof genSessionInsights>>;
export type SessionInsightsListResponse = Awaited<ReturnType<typeof genSessionsInsights>>;
export type SessionAttachmentList = Awaited<ReturnType<typeof genSessionAttachments>>;
export type SessionTagsResponse = Awaited<ReturnType<typeof genSessionTagsGet>>;

// commands が使うリクエスト/レスポンス型。生成スキーマへの参照はここに閉じ込める
export type {
  AutomationCreateRequest,
  AutomationResponse,
  AutomationSchemasResponse,
  AutomationTemplatesResponse,
  AutomationUpdateRequest,
  FolderTreeResponse,
  GetOrganizationsOrgIdAutomationsParams,
  GetOrganizationsOrgIdAutomationsSchemasParams,
  GetOrganizationsOrgIdKnowledgeNotesParams,
  GetOrganizationsOrgIdSchedulesParams,
  KnowledgeNoteCreateRequest,
  KnowledgeNoteResponse,
  PaginatedResponseAutomationResponse,
  PaginatedResponseKnowledgeNoteResponse,
  PaginatedResponseScheduleResponse,
  ScheduleCreateRequest,
  ScheduleResponse,
  ScheduleUpdateRequest,
};

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

// knowledge notes (org scope)。list は cursor ページング、他は単発
export const knowledgeFolders = (orgId: string) => genKnowledgeFolders(enc(orgId));
export const knowledgeNotes = (orgId: string, params?: GetOrganizationsOrgIdKnowledgeNotesParams) =>
  genKnowledgeNotes(enc(orgId), params);
export const knowledgeNote = (orgId: string, noteId: string) =>
  genKnowledgeNote(enc(orgId), enc(noteId));
export const createKnowledgeNote = (orgId: string, body: KnowledgeNoteCreateRequest) =>
  genCreateKnowledgeNote(enc(orgId), body);
export const updateKnowledgeNote = (
  orgId: string,
  noteId: string,
  body: KnowledgeNoteCreateRequest,
) => genUpdateKnowledgeNote(enc(orgId), enc(noteId), body);
export const deleteKnowledgeNote = (orgId: string, noteId: string) =>
  genDeleteKnowledgeNote(enc(orgId), enc(noteId));

// automations (org scope)。list は cursor ページング
export const automations = (orgId: string, params?: GetOrganizationsOrgIdAutomationsParams) =>
  genAutomations(enc(orgId), params);
export const automation = (orgId: string, automationId: string) =>
  genAutomation(enc(orgId), enc(automationId));
export const createAutomation = (orgId: string, body: AutomationCreateRequest) =>
  genCreateAutomation(enc(orgId), body);
export const updateAutomation = (
  orgId: string,
  automationId: string,
  body: AutomationUpdateRequest,
) => genPatchAutomation(enc(orgId), enc(automationId), body);
export const deleteAutomation = (orgId: string, automationId: string) =>
  genDeleteAutomation(enc(orgId), enc(automationId));
export const automationSchemas = (
  orgId: string,
  params?: GetOrganizationsOrgIdAutomationsSchemasParams,
) => genAutomationSchemas(enc(orgId), params);
export const automationTemplates = (orgId: string) => genAutomationTemplates(enc(orgId));

// schedules (org scope、deprecated)。list は offset ページング
export const schedules = (orgId: string, params?: GetOrganizationsOrgIdSchedulesParams) =>
  genSchedules(enc(orgId), params);
export const schedule = (orgId: string, scheduleId: string) =>
  genSchedule(enc(orgId), enc(scheduleId));
export const createSchedule = (orgId: string, body: ScheduleCreateRequest) =>
  genCreateSchedule(enc(orgId), body);
export const updateSchedule = (orgId: string, scheduleId: string, body: ScheduleUpdateRequest) =>
  genPatchSchedule(enc(orgId), enc(scheduleId), body);
export const deleteSchedule = (orgId: string, scheduleId: string) =>
  genDeleteSchedule(enc(orgId), enc(scheduleId));

// sessions。list / messages / insights(list) は cursor ページネーション (after + first、
// 応答は {items, end_cursor, has_next_page, total})。ページを繋ぐのは commands/sessions.ts
export const sessionsList = (orgId: string, params: GetOrganizationsOrgIdSessionsParams) =>
  genSessionsList(enc(orgId), params);
export const sessionGet = (orgId: string, devinId: string) =>
  genSessionGet(enc(orgId), enc(devinId));
export const sessionMessages = (
  orgId: string,
  devinId: string,
  params?: GetOrganizationsOrgIdSessionsDevinIdMessagesParams,
) => genSessionMessages(enc(orgId), enc(devinId), params);
export const sessionsInsights = (orgId: string, params: GetOrganizationsOrgIdSessionsParams) =>
  genSessionsInsights(enc(orgId), params);
export const sessionInsights = (orgId: string, devinId: string) =>
  genSessionInsights(enc(orgId), enc(devinId));
export const sessionAttachments = (orgId: string, devinId: string) =>
  genSessionAttachments(enc(orgId), enc(devinId));
export const sessionCreate = (orgId: string, body: SessionCreateRequest) =>
  genSessionCreate(enc(orgId), body);
export const sessionArchive = (orgId: string, devinId: string) =>
  genSessionArchive(enc(orgId), enc(devinId));
export const sessionDelete = (
  orgId: string,
  devinId: string,
  params?: DeleteOrganizationsOrgIdSessionsDevinIdParams,
) => genSessionDelete(enc(orgId), enc(devinId), params);
export const sessionTagsGet = (orgId: string, devinId: string) =>
  genSessionTagsGet(enc(orgId), enc(devinId));
export const sessionTagsAdd = (orgId: string, devinId: string, body: SessionTagsUpdateRequest) =>
  genSessionTagsAdd(enc(orgId), enc(devinId), body);
export const sessionTagsSet = (orgId: string, devinId: string, body: SessionTagsUpdateRequest) =>
  genSessionTagsSet(enc(orgId), enc(devinId), body);
