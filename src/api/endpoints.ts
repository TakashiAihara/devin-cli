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
  deleteOrganizationsOrgIdSchedulesScheduleId as genDeleteSchedule,
  deleteOrganizationsOrgIdSessionsDevinId as genSessionDelete,
  getOrganizationsOrgIdAutomations as genAutomations,
  getOrganizationsOrgIdAutomationsAutomationId as genAutomation,
  getOrganizationsOrgIdAutomationsSchemas as genAutomationSchemas,
  getOrganizationsOrgIdAutomationsTemplates as genAutomationTemplates,
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
  getOrganizationsOrgIdSchedules as genSchedules,
  getOrganizationsOrgIdSchedulesScheduleId as genSchedule,
  getOrganizationsOrgIdSessions as genSessionsList,
  getOrganizationsOrgIdSessionsDevinId as genSessionGet,
  getOrganizationsOrgIdSessionsDevinIdAttachments as genSessionAttachments,
  getOrganizationsOrgIdSessionsDevinIdInsights as genSessionInsights,
  getOrganizationsOrgIdSessionsDevinIdMessages as genSessionMessages,
  getOrganizationsOrgIdSessionsDevinIdTags as genSessionTagsGet,
  getOrganizationsOrgIdSessionsInsights as genSessionsInsights,
  getSelf as genSelf,
  patchOrganizationsOrgIdAutomationsAutomationId as genPatchAutomation,
  patchOrganizationsOrgIdSchedulesScheduleId as genPatchSchedule,
  postOrganizationsOrgIdAutomations as genCreateAutomation,
  postOrganizationsOrgIdKnowledgeNotes as genCreateKnowledgeNote,
  postOrganizationsOrgIdSchedules as genCreateSchedule,
  postOrganizationsOrgIdSessions as genSessionCreate,
  postOrganizationsOrgIdSessionsDevinIdArchive as genSessionArchive,
  postOrganizationsOrgIdSessionsDevinIdTags as genSessionTagsAdd,
  putOrganizationsOrgIdKnowledgeNotesNoteId as genUpdateKnowledgeNote,
  putOrganizationsOrgIdSessionsDevinIdTags as genSessionTagsSet,
} from "../generated/index.ts";
import type {
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
} from "../generated/api.schemas.ts";

export type SelfResponse = Awaited<ReturnType<typeof genSelf>>;
export type ConsumptionResponse = Awaited<ReturnType<typeof genConsumptionDaily>>;
export type UsageMetrics = Awaited<ReturnType<typeof genMetricsUsage>>;
export type SessionMetricsResponse = Awaited<ReturnType<typeof genMetricsSessions>>;
export type PrMetricsResponse = Awaited<ReturnType<typeof genMetricsPrs>>;
export type SearchMetricsResponse = Awaited<ReturnType<typeof genMetricsSearches>>;
export type ActiveUserMetricsList = Awaited<ReturnType<typeof genMetricsDau>>;
export type ActiveUserMetrics = Awaited<ReturnType<typeof genMetricsActiveUsers>>;
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
