// 生成クライアント (src/generated/) への薄いアダプタ。
// Orval の関数名・シグネチャが変わっても commands/ は触らずに済むよう、ここに閉じ込める
import type {
  OrgDefaultPlatformUpdateRequest,
  PaginatedResponseIdpGroupUser,
  PaginatedResponsePlaybookResponse,
  PaginatedResponseSecurityProfileResponse,
  PaginatedResponseUser,
  PlaybookCreateRequest,
  PrReviewCreateRequest,
  SecurityProfileCreateRequest,
  SecurityProfileSettingsUpdateRequest,
  SecurityProfileUpdateRequest,
} from "../generated/api.schemas.ts";
import {
  deleteOrganizationsOrgIdPlaybooksPlaybookId as genDeletePlaybook,
  deleteV3beta1OrganizationsOrgIdSecurityProfilesProfileId as genDeleteSecurityProfile,
  getOrganizationsOrgIdPlaybooks as genPlaybooks,
  getOrganizationsOrgIdPlaybooksPlaybookId as genPlaybook,
  getOrganizationsOrgIdPrReviews as genPrReview,
  getV3beta1OrganizationsOrgIdDefaultPlatform as genDefaultPlatform,
  getV3beta1OrganizationsOrgIdMembersIdpUsers as genMembersIdpUsers,
  getV3beta1OrganizationsOrgIdMembersUsers as genMembersUsers,
  getV3beta1OrganizationsOrgIdMembersUsersUserId as genMemberUser,
  getV3beta1OrganizationsOrgIdSecurityProfileSettings as genSecurityProfileSettings,
  getV3beta1OrganizationsOrgIdSecurityProfiles as genSecurityProfiles,
  getV3beta1OrganizationsOrgIdSecurityProfilesProfileId as genSecurityProfile,
  patchV3beta1OrganizationsOrgIdSecurityProfileSettings as genUpdateSecurityProfileSettings,
  patchV3beta1OrganizationsOrgIdSecurityProfilesProfileId as genUpdateSecurityProfile,
  postOrganizationsOrgIdPlaybooks as genCreatePlaybook,
  postOrganizationsOrgIdPrReviews as genCreatePrReview,
  postOrganizationsOrgIdAttachments as genUploadAttachment,
  postV3beta1OrganizationsOrgIdSecurityProfiles as genCreateSecurityProfile,
  putOrganizationsOrgIdPlaybooksPlaybookId as genUpdatePlaybook,
  putV3beta1OrganizationsOrgIdDefaultPlatform as genSetDefaultPlatform,
} from "../generated/index.ts";
import { apiRaw } from "./mutator.ts";
import { apiTimeoutMs, ExitError, sendBytes } from "../lib.ts";
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

export type Member = PaginatedResponseUser["items"][number];
export type MemberDetail = Awaited<ReturnType<typeof genMemberUser>>;
export type IdpUser = PaginatedResponseIdpGroupUser["items"][number];
export type PlaybookItem = PaginatedResponsePlaybookResponse["items"][number];
export type Playbook = Awaited<ReturnType<typeof genPlaybook>>;
export type PrReview = Awaited<ReturnType<typeof genPrReview>>;
export type Attachment = Awaited<ReturnType<typeof genUploadAttachment>>;
export type SecurityProfileItem = PaginatedResponseSecurityProfileResponse["items"][number];
export type SecurityProfile = Awaited<ReturnType<typeof genSecurityProfile>>;
export type SecurityProfileSettings = Awaited<ReturnType<typeof genSecurityProfileSettings>>;
export type DefaultPlatform = Awaited<ReturnType<typeof genDefaultPlatform>>;

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

// --- pagination ---
// 一覧系は {items, end_cursor, has_next_page, total} の cursor 方式 (first=ページ幅, after=cursor)。
// --limit は「取る件数の上限」。省略時は has_next_page が尽きるまで全ページ辿る
const PAGE_MAX = 200; // spec 上の first の上限

type Page<T> = {
  items: T[];
  end_cursor?: string | null;
  has_next_page?: boolean;
  total?: number | null;
};

export async function collectPages<T>(
  fetchPage: (params: { first: number; after?: string }) => Promise<Page<T>>,
  limit?: number,
): Promise<{ items: T[]; total?: number | null }> {
  const items: T[] = [];
  let after: string | undefined;
  let total: number | null | undefined;
  for (;;) {
    const remain = limit === undefined ? PAGE_MAX : Math.min(PAGE_MAX, limit - items.length);
    if (remain <= 0) break;
    const page = await fetchPage({ first: remain, ...(after === undefined ? {} : { after }) });
    items.push(...page.items);
    total = page.total ?? total;
    if (!page.has_next_page || !page.end_cursor) break;
    if (limit !== undefined && items.length >= limit) break;
    // 同じ cursor が返り続ける異常系で無限ループしないようにする
    if (page.end_cursor === after) break;
    after = page.end_cursor;
  }
  return { items: limit === undefined ? items : items.slice(0, limit), total };
}

// --- members (v3beta1) ---
export const membersUsers = (orgId: string, limit?: number) =>
  collectPages<Member>((p) => genMembersUsers(enc(orgId), p), limit);
export const memberUser = (orgId: string, userId: string) => genMemberUser(enc(orgId), enc(userId));
export const membersIdpUsers = (orgId: string, limit?: number) =>
  collectPages<IdpUser>((p) => genMembersIdpUsers(enc(orgId), p), limit);

// --- playbooks ---
export const playbooks = (
  orgId: string,
  opts: { limit?: number; includeEnterprise?: boolean } = {},
) =>
  collectPages<PlaybookItem>(
    (p) => genPlaybooks(enc(orgId), { ...p, include_enterprise: opts.includeEnterprise }),
    opts.limit,
  );
export const playbook = (orgId: string, playbookId: string) =>
  genPlaybook(enc(orgId), enc(playbookId));
export const createPlaybook = (orgId: string, body: PlaybookCreateRequest) =>
  genCreatePlaybook(enc(orgId), body);
export const updatePlaybook = (orgId: string, playbookId: string, body: PlaybookCreateRequest) =>
  genUpdatePlaybook(enc(orgId), enc(playbookId), body);
export const deletePlaybook = (orgId: string, playbookId: string) =>
  genDeletePlaybook(enc(orgId), enc(playbookId));

// --- pr-reviews ---
// GET は pr_url が必須 (一覧 API ではない)。commit_sha 省略時は PR の head が使われる
export const prReview = (orgId: string, prUrl: string, commitSha?: string) =>
  genPrReview(enc(orgId), {
    pr_url: prUrl,
    ...(commitSha === undefined ? {} : { commit_sha: commitSha }),
  });
export const createPrReview = (orgId: string, body: PrReviewCreateRequest) =>
  genCreatePrReview(enc(orgId), body);

// --- attachments ---
export const uploadAttachment = (orgId: string, file: File) =>
  genUploadAttachment(enc(orgId), { file });

export type AttachmentDownload = { bytes: Uint8Array; contentType: string | null };

// GET .../attachments/{uuid}/{name} は 307 で presigned URL に飛ばす。
// apiFetch 系は JSON 前提なので、ここでは apiRaw で 3xx を受けて Location を自分で取りに行く。
// 2 段目の presigned fetch には Devin の credential を付けない (別ホストへの漏洩を防ぐ)
export async function attachmentDownload(
  orgId: string,
  uuid: string,
  name: string,
): Promise<AttachmentDownload> {
  const r = await apiRaw(`/v3/organizations/${enc(orgId)}/attachments/${enc(uuid)}/${enc(name)}`, {
    redirect: "manual",
  });
  const contentType = r.headers.get("content-type");
  if (!(r.status >= 300 && r.status < 400)) return { bytes: r.bytes, contentType };
  const loc = r.headers.get("location");
  if (!loc) throw new ExitError(`attachment の応答 (HTTP ${r.status}) に Location が無い`, 70);
  let u: URL;
  try {
    u = new URL(loc);
  } catch {
    throw new ExitError(`attachment のリダイレクト先を URL として読めない`, 70);
  }
  if (u.protocol !== "https:" && u.protocol !== "http:")
    throw new ExitError(`attachment のリダイレクト先が http/https でない`, 70);
  const res = await sendBytes(loc, {}, apiTimeoutMs());
  if (!res.ok) throw new ExitError(`attachment のダウンロード先が HTTP ${res.status} を返した`, 1);
  return { bytes: res.bytes, contentType: res.headers.get("content-type") ?? contentType };
}

// --- security-profiles (v3beta1, org scope) ---
export const securityProfiles = (orgId: string, limit?: number) =>
  collectPages<SecurityProfileItem>((p) => genSecurityProfiles(enc(orgId), p), limit);
export const securityProfile = (orgId: string, profileId: string) =>
  genSecurityProfile(enc(orgId), enc(profileId));
export const createSecurityProfile = (orgId: string, body: SecurityProfileCreateRequest) =>
  genCreateSecurityProfile(enc(orgId), body);
export const updateSecurityProfile = (
  orgId: string,
  profileId: string,
  body: SecurityProfileUpdateRequest,
) => genUpdateSecurityProfile(enc(orgId), enc(profileId), body);
export const deleteSecurityProfile = (orgId: string, profileId: string) =>
  genDeleteSecurityProfile(enc(orgId), enc(profileId));

// --- security-profile-settings (v3beta1) ---
export const securityProfileSettings = (orgId: string) => genSecurityProfileSettings(enc(orgId));
export const updateSecurityProfileSettings = (
  orgId: string,
  body: SecurityProfileSettingsUpdateRequest,
) => genUpdateSecurityProfileSettings(enc(orgId), body);

// --- default-platform (v3beta1) ---
export const defaultPlatform = (orgId: string) => genDefaultPlatform(enc(orgId));
export const setDefaultPlatform = (orgId: string, body: OrgDefaultPlatformUpdateRequest) =>
  genSetDefaultPlatform(enc(orgId), body);
