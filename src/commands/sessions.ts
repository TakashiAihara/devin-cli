import type {
  SessionCreateRequest,
  SessionMessage,
  SessionsQueryParams,
} from "../generated/api.schemas.ts";
import {
  sessionArchive,
  sessionAttachments,
  sessionCreate,
  sessionDelete,
  sessionGet,
  sessionInsights,
  sessionMessages,
  sessionTagsAdd,
  sessionTagsGet,
  sessionTagsSet,
  sessionsInsights,
  sessionsList,
  type SessionAttachmentList,
  type SessionInsightsListResponse,
  type SessionInsightsResponse,
  type SessionListResponse,
  type SessionMessageListResponse,
  type SessionResponse,
  type SessionTagsResponse,
} from "../api/endpoints.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cellText, die, guard, json, oneLine, print } from "../lib.ts";

// sessions list / insights(list) / messages は cursor ページネーション
// (query: after + first<=200、応答: {items, end_cursor, has_next_page, total})。
// has_next_page が true の間 end_cursor を辿って全件取る。--limit は出力件数の上限
const PAGE_SIZE = 200;

type Page<T> = {
  items: T[];
  end_cursor?: string | null;
  has_next_page?: boolean;
  total?: number | null;
};

// カーソルの再訪・空ページ・end_cursor 欠落で打ち切り、無限ループを防ぐ。
// match (--status のクライアント側フィルタ) を通った件数だけを limit に数える
async function collectPages<T>(
  limit: number | undefined,
  match: ((item: T) => boolean) | undefined,
  fetchPage: (after: string | undefined, first: number) => Promise<Page<T>>,
): Promise<{ items: T[]; total: number | null | undefined }> {
  const items: T[] = [];
  const seen = new Set<string>();
  let after: string | undefined;
  let total: number | null | undefined;
  for (;;) {
    // match があるときは何件残っているか分からないので常にページ幅いっぱい取る
    const want =
      limit === undefined || match !== undefined
        ? PAGE_SIZE
        : Math.min(PAGE_SIZE, limit - items.length);
    const page = await fetchPage(after, want);
    total = page.total ?? total;
    for (const item of page.items) {
      if (!match || match(item)) items.push(item);
    }
    if (limit !== undefined && items.length >= limit) break;
    const cursor = page.end_cursor ?? undefined;
    if (!page.has_next_page || cursor === undefined || seen.has(cursor) || page.items.length === 0)
      break;
    seen.add(cursor);
    after = cursor;
  }
  return { items: limit === undefined ? items : items.slice(0, limit), total };
}

// 一覧系のフィルタ。--status は API に無いのでクライアント側で絞る (それ以外は qs に載る)
export type SessionFilterOptions = {
  limit?: number;
  status?: string[];
  archived?: boolean;
  active?: boolean;
  tags?: string[];
  origins?: string[];
  userIds?: string[];
  repoNames?: string[];
  createdAfter?: number;
  createdBefore?: number;
  updatedAfter?: number;
  updatedBefore?: number;
  org?: string;
  json: boolean;
};

function sessionQuery(f: SessionFilterOptions, first: number, after?: string): SessionsQueryParams {
  if (f.archived && f.active) die("--archived と --active は同時に使えない", 2);
  const qs: SessionsQueryParams = { first };
  if (after !== undefined) qs.after = after;
  if (f.archived) qs.is_archived = true;
  if (f.active) qs.is_archived = false;
  if (f.tags?.length) qs.tags = f.tags;
  if (f.origins?.length) qs.origins = f.origins as NonNullable<SessionsQueryParams["origins"]>;
  if (f.userIds?.length) qs.user_ids = f.userIds;
  if (f.repoNames?.length) qs.repo_names = f.repoNames;
  if (f.createdAfter !== undefined) qs.created_after = f.createdAfter;
  if (f.createdBefore !== undefined) qs.created_before = f.createdBefore;
  if (f.updatedAfter !== undefined) qs.updated_after = f.updatedAfter;
  if (f.updatedBefore !== undefined) qs.updated_before = f.updatedBefore;
  return qs;
}

const statusMatcher = (status: string[] | undefined) =>
  status?.length ? (item: { status: string }) => status.includes(item.status) : undefined;

// Unix 秒 → ISO 8601 (UTC)。null/undefined は "-"
const ts = (unixSec: number | null | undefined): string =>
  unixSec === null || unixSec === undefined ? "-" : new Date(unixSec * 1000).toISOString();

const SESSION_HEADER =
  "session_id\tstatus\tstatus_detail\ttitle\tcreated_at\tupdated_at\tacus_consumed\torigin\tis_archived\tuser_id\turl\ttags";

const sessionRow = (s: SessionResponse): string =>
  [
    s.session_id,
    s.status,
    cellText(s.status_detail),
    cellText(s.title),
    ts(s.created_at),
    ts(s.updated_at),
    cellText(s.acus_consumed),
    cellText(s.origin),
    cellText(s.is_archived),
    cellText(s.user_id),
    s.url,
    s.tags.length ? s.tags.join(",") : "-",
  ].join("\t");

const emitSession = (s: SessionResponse, asJson: boolean): number => {
  if (asJson) {
    json(s);
    return 0;
  }
  print(SESSION_HEADER);
  print(sessionRow(s));
  return 0;
};

const emitRows = (header: string, rows: string[], asJson: boolean, body: unknown): number => {
  if (asJson) {
    json(body);
    return 0;
  }
  print(header);
  for (const row of rows) print(row);
  return 0;
};

export const runSessionsList = guard(async (o: SessionFilterOptions) => {
  const orgId = await resolveOrgId(o.org);
  const match = statusMatcher(o.status);
  const { items, total } = await collectPages(o.limit, match, (after, first) =>
    sessionsList(orgId, { qs: sessionQuery(o, first, after) }),
  );
  return emitRows(SESSION_HEADER, items.map(sessionRow), o.json, {
    items,
    total,
  } satisfies Partial<SessionListResponse>);
});

export const runSessionsGet = guard(async (o: { devinId: string; org?: string; json: boolean }) => {
  const orgId = await resolveOrgId(o.org);
  const s = await sessionGet(orgId, o.devinId);
  return emitSession(s, o.json);
});

const MESSAGE_HEADER = "created_at\tsource\tusername\tuser_id\tmessage";

const messageRow = (m: SessionMessage): string =>
  [ts(m.created_at), m.source, cellText(m.username), cellText(m.user_id), cellText(m.message)].join(
    "\t",
  );

export const runSessionsMessages = guard(
  async (o: { devinId: string; limit?: number; org?: string; json: boolean }) => {
    const orgId = await resolveOrgId(o.org);
    const { items, total } = await collectPages<SessionMessage>(
      o.limit,
      undefined,
      (after, first) => sessionMessages(orgId, o.devinId, { after, first }),
    );
    return emitRows(MESSAGE_HEADER, items.map(messageRow), o.json, {
      items,
      total,
    } satisfies Partial<SessionMessageListResponse>);
  },
);

const INSIGHTS_HEADER =
  "session_id\tstatus\tstatus_detail\tsession_size\tcategory\tacus_consumed\tnum_user_messages\tnum_devin_messages\tanalysis_status\ttitle\tcreated_at\tupdated_at\turl";

const insightsRow = (s: SessionInsightsResponse): string =>
  [
    s.session_id,
    s.status,
    cellText(s.status_detail),
    s.session_size,
    cellText(s.category),
    cellText(s.acus_consumed),
    cellText(s.num_user_messages),
    cellText(s.num_devin_messages),
    cellText(s.analysis_status),
    cellText(s.title),
    ts(s.created_at),
    ts(s.updated_at),
    s.url,
  ].join("\t");

const hasListFilters = (o: SessionFilterOptions): boolean =>
  o.limit !== undefined ||
  (o.status?.length ?? 0) > 0 ||
  o.archived === true ||
  o.active === true ||
  (o.tags?.length ?? 0) > 0 ||
  (o.origins?.length ?? 0) > 0 ||
  (o.userIds?.length ?? 0) > 0 ||
  (o.repoNames?.length ?? 0) > 0 ||
  o.createdAfter !== undefined ||
  o.createdBefore !== undefined ||
  o.updatedAfter !== undefined ||
  o.updatedBefore !== undefined;

// devin_id 省略時は組織全体の insights 一覧 (ページネーションあり)、指定時は単一セッション
export const runSessionsInsights = guard(async (o: SessionFilterOptions & { devinId?: string }) => {
  const orgId = await resolveOrgId(o.org);
  if (o.devinId !== undefined) {
    if (hasListFilters(o)) die("--limit/--status/--tag 等のフィルタは ID 指定時は使えない", 2);
    const s = await sessionInsights(orgId, o.devinId);
    return emitRows(INSIGHTS_HEADER, [insightsRow(s)], o.json, s);
  }
  const match = statusMatcher(o.status);
  const { items, total } = await collectPages(o.limit, match, (after, first) =>
    sessionsInsights(orgId, { qs: sessionQuery(o, first, after) }),
  );
  return emitRows(INSIGHTS_HEADER, items.map(insightsRow), o.json, {
    items,
    total,
  } satisfies Partial<SessionInsightsListResponse>);
});

const ATTACHMENT_HEADER = "attachment_id\tname\tcontent_type\tsource\turl";

const attachmentRow = (a: SessionAttachmentList[number]): string =>
  [a.attachment_id, cellText(a.name), cellText(a.content_type), a.source, a.url].join("\t");

export const runSessionsAttachments = guard(
  async (o: { devinId: string; org?: string; json: boolean }) => {
    const orgId = await resolveOrgId(o.org);
    const items = await sessionAttachments(orgId, o.devinId);
    return emitRows(ATTACHMENT_HEADER, items.map(attachmentRow), o.json, items);
  },
);

export type SessionCreateOptions = {
  prompt: string;
  title?: string;
  repos?: string[];
  tags?: string[];
  playbookId?: string;
  attachmentUrls?: string[];
  devinMode?: string;
  maxAcuLimit?: number;
  platform?: string;
  bypassApproval?: boolean;
  org?: string;
  json: boolean;
};

// セッション作成は実費が発生する。prompt "-" は stdin から読む (パイプ利用向け)
export const runSessionsCreate = guard(async (o: SessionCreateOptions) => {
  const orgId = await resolveOrgId(o.org);
  const prompt = o.prompt === "-" ? await Bun.stdin.text() : o.prompt;
  if (!prompt.trim()) die("--prompt が空", 2);
  const body: SessionCreateRequest = { prompt };
  if (o.title) body.title = o.title;
  if (o.repos?.length) body.repos = o.repos;
  if (o.tags?.length) body.tags = o.tags;
  if (o.playbookId) body.playbook_id = o.playbookId;
  if (o.attachmentUrls?.length) body.attachment_urls = o.attachmentUrls;
  if (o.devinMode) body.devin_mode = o.devinMode as SessionCreateRequest["devin_mode"];
  if (o.maxAcuLimit !== undefined) body.max_acu_limit = o.maxAcuLimit;
  if (o.platform) body.platform = o.platform;
  if (o.bypassApproval) body.bypass_approval = true;
  const s = await sessionCreate(orgId, body);
  return emitSession(s, o.json);
});

export const runSessionsArchive = guard(
  async (o: { devinId: string; org?: string; json: boolean }) => {
    const orgId = await resolveOrgId(o.org);
    const s = await sessionArchive(orgId, o.devinId);
    return emitSession(s, o.json);
  },
);

const emitTags = (res: SessionTagsResponse, asJson: boolean): number => {
  if (asJson) {
    json(res);
    return 0;
  }
  print("tag");
  for (const t of res.tags) print(cellText(t));
  return 0;
};

export const runSessionsTagsGet = guard(
  async (o: { devinId: string; org?: string; json: boolean }) => {
    const orgId = await resolveOrgId(o.org);
    return emitTags(await sessionTagsGet(orgId, o.devinId), o.json);
  },
);

export const runSessionsTagsAdd = guard(
  async (o: { devinId: string; tags: string[]; org?: string; json: boolean }) => {
    const orgId = await resolveOrgId(o.org);
    return emitTags(await sessionTagsAdd(orgId, o.devinId, { tags: o.tags }), o.json);
  },
);

// set は全置換。タグ 0 個でも PUT できる (= 全タグ削除)
export const runSessionsTagsSet = guard(
  async (o: { devinId: string; tags: string[]; org?: string; json: boolean }) => {
    const orgId = await resolveOrgId(o.org);
    return emitTags(await sessionTagsSet(orgId, o.devinId, { tags: o.tags }), o.json);
  },
);

// DELETE は破壊的 (セッション終了)。--yes が無いときは GET で対象を表示する dry-run にして exit 2
export const runSessionsDelete = guard(
  async (o: { devinId: string; yes?: boolean; archive?: boolean; org?: string; json: boolean }) => {
    const orgId = await resolveOrgId(o.org);
    if (!o.yes) {
      const s = await sessionGet(orgId, o.devinId);
      die(
        `dry-run: DELETE /v3/organizations/${orgId}/sessions/${o.devinId}` +
          `${o.archive ? "?archive=true" : ""} は実行しない\n` +
          `  session: ${s.session_id} "${oneLine(s.title ?? "")}" status=${s.status}` +
          `${s.is_archived ? " archived" : ""}\n` +
          `実行するには --yes を付ける`,
        2,
      );
    }
    const s = await sessionDelete(orgId, o.devinId, o.archive ? { archive: true } : undefined);
    return emitSession(s, o.json);
  },
);
