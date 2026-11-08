import { formatTimestamp } from "../dates.ts";
import {
  collectPages,
  getRepoIndexing,
  indexRepositoriesBulk,
  indexRepository,
  listIndexedRepositories,
  listRepositories,
  unindexRepositoriesBulk,
  unindexRepository,
  unindexRepositoryBranch,
  type RepoIndexingStatus,
  type RepositoryIndexing,
  type RepositoryListPage,
} from "../api/endpoints.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cell, cellText, guard, json, print } from "../lib.ts";

export type ListOptions = { limit?: number; org?: string; json: boolean };
export type FilteredListOptions = ListOptions & { filter?: string };
export type IndexingSetOptions = {
  paths: string[];
  branches: string[];
  org?: string;
  json: boolean;
};
export type IndexingRepoOptions = { path: string; branches: string[]; org?: string; json: boolean };

// repositories list の first 上限は 100、indexing list は 200 (OpenAPI の maximum)
const REPO_FIRST = 100;
const INDEXING_FIRST = 200;

const branchesCell = (branches: string[] | undefined) =>
  branches && branches.length > 0 ? branches.join(",") : "-";

// RepositoryIndexingResponse (およびその配列) の TSV。list / set / delete / branch delete で共用
function indexingLines(items: RepositoryIndexing[]): string[] {
  const lines = ["repository_path\tindexing_enabled\tbranches"];
  for (const r of items)
    lines.push(
      [cellText(r.repository_path), cell(r.indexing_enabled), branchesCell(r.branches)].join("\t"),
    );
  return lines;
}

// repositories list (GET /repositories) の TSV
function repositoryLines(res: RepositoryListPage): string[] {
  const lines = [
    "repo_path\trepo_name\trepo_full_name\trepo_language\tgit_connection_host\tlast_updated_at\tindexing_enabled",
  ];
  for (const r of res.items) {
    lines.push(
      [
        cellText(r.repo_path),
        cellText(r.repo_name),
        cellText(r.repo_full_name),
        cellText(r.repo_language),
        cellText(r.git_connection_host),
        r.last_updated_at === null || r.last_updated_at === undefined
          ? "-"
          : formatTimestamp(r.last_updated_at),
        cell(r.indexing_status?.indexing_enabled),
      ].join("\t"),
    );
  }
  return lines;
}

// RepoIndexingStatusResponse (GET /repositories/{path}/indexing) の TSV。
// ネストした job 情報があるのでスカラー部と latest_indexes の 2 テーブルに分ける
function repoIndexingStatusLines(res: RepoIndexingStatus): string[] {
  const lines = [
    "indexing_enabled\tlatest_completed_search_index_job_status\tlatest_completed_wiki_index_job_status",
    [
      cell(res.indexing_enabled),
      cell(res.latest_completed_search_index_job?.status),
      cell(res.latest_completed_wiki_index_job?.status),
    ].join("\t"),
    "branch_name\tcommit\tstatus\tcreated_at\tjob_id",
  ];
  for (const j of res.latest_indexes ?? []) {
    lines.push(
      [
        cellText(j.branch_name),
        cellText(j.commit),
        cellText(j.status),
        formatTimestamp(j.created_at),
        cellText(j.job_id),
      ].join("\t"),
    );
  }
  return lines;
}

const emitPage = (asJson: boolean, body: unknown, lines: string[]) => {
  if (asJson) {
    json(body);
    return 0;
  }
  for (const line of lines) print(line);
  return 0;
};

export const runRepositoriesList = guard(async (o: FilteredListOptions) => {
  const orgId = await resolveOrgId(o.org);
  const page = await collectPages(REPO_FIRST, o.limit, (after, first) =>
    listRepositories(orgId, { after, first, filter_name: o.filter ?? null }),
  );
  return emitPage(o.json, page, repositoryLines(page));
});

export const runIndexingList = guard(async (o: FilteredListOptions) => {
  const orgId = await resolveOrgId(o.org);
  const page = await collectPages(INDEXING_FIRST, o.limit, (after, first) =>
    listIndexedRepositories(orgId, { after, first, filter_name: o.filter ?? null }),
  );
  return emitPage(o.json, page, indexingLines(page.items));
});

// PUT /repositories/indexing — repositories[] に同じ branch_names を適用する
export const runIndexingSet = guard(async (o: IndexingSetOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await indexRepositoriesBulk(orgId, {
    repositories: o.paths.map((repository_path) => ({
      repository_path,
      // undefined は JSON.stringify で落ちるので branch_names 省略と同じになる
      branch_names: o.branches.length > 0 ? o.branches : undefined,
    })),
  });
  if (o.json) {
    json(res);
    return 0;
  }
  for (const line of indexingLines(res)) print(line);
  return 0;
});

// DELETE /repositories/indexing — repository_paths の一括削除
export const runIndexingDelete = guard(async (o: ListOptions & { paths: string[] }) => {
  const orgId = await resolveOrgId(o.org);
  const res = await unindexRepositoriesBulk(orgId, { repository_paths: o.paths });
  if (o.json) {
    json(res);
    return 0;
  }
  for (const line of indexingLines(res)) print(line);
  return 0;
});

export const runIndexingRepoGet = guard(
  async (o: { path: string; org?: string; json: boolean }) => {
    const orgId = await resolveOrgId(o.org);
    const res = await getRepoIndexing(orgId, o.path);
    if (o.json) {
      json(res);
      return 0;
    }
    for (const line of repoIndexingStatusLines(res)) print(line);
    return 0;
  },
);

export const runIndexingRepoSet = guard(async (o: IndexingRepoOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await indexRepository(orgId, o.path, {
    branch_names: o.branches.length > 0 ? o.branches : undefined,
  });
  if (o.json) {
    json(res);
    return 0;
  }
  for (const line of indexingLines([res])) print(line);
  return 0;
});

export const runIndexingRepoDelete = guard(
  async (o: { path: string; org?: string; json: boolean }) => {
    const orgId = await resolveOrgId(o.org);
    const res = await unindexRepository(orgId, o.path);
    if (o.json) {
      json(res);
      return 0;
    }
    for (const line of indexingLines([res])) print(line);
    return 0;
  },
);

export const runIndexingBranchDelete = guard(
  async (o: { path: string; branch: string; org?: string; json: boolean }) => {
    const orgId = await resolveOrgId(o.org);
    const res = await unindexRepositoryBranch(orgId, o.path, o.branch);
    if (o.json) {
      json(res);
      return 0;
    }
    for (const line of indexingLines([res])) print(line);
    return 0;
  },
);
