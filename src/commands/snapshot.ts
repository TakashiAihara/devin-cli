import { readFileSync } from "node:fs";
import { formatTimestamp } from "../dates.ts";
import {
  collectPages,
  snapshotBlueprint,
  snapshotBlueprintContents,
  snapshotBlueprintCreate,
  snapshotBlueprintDelete,
  snapshotBlueprintFileDelete,
  snapshotBlueprintFileUpload,
  snapshotBlueprintFiles,
  snapshotBlueprints,
  snapshotBlueprintUpdate,
  snapshotBuild,
  snapshotBuildCancel,
  snapshotBuildLogs,
  snapshotBuildPin,
  snapshotBuildTrigger,
  snapshotBuilds,
  snapshotBuildUnpin,
  type SnapshotBlueprint,
  type SnapshotBlueprintFile,
  type SnapshotBuild,
  type SnapshotPresignedDownload,
} from "../api/endpoints.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cell, cellText, die, guard, json, print } from "../lib.ts";

// body / params の型は endpoints 経由で引く (commands から generated を直接触らない)
type CreateBody = Parameters<typeof snapshotBlueprintCreate>[1];
type UpdateBody = Parameters<typeof snapshotBlueprintUpdate>[2];
type BuildsParams = NonNullable<Parameters<typeof snapshotBuilds>[1]>;

export type BlueprintsListOptions = { repo?: string; org?: string; json: boolean };
export type BlueprintWriteOptions = {
  repo?: string;
  source?: string;
  contents?: string;
  contentsFile?: string;
  org?: string;
  json: boolean;
};
export type BlueprintUpdateCliOptions = BlueprintWriteOptions & {
  id: string;
  position?: number;
  buildOnDefaultBranch?: boolean;
  reportCheckRuns?: boolean;
};
export type IdOptions = { id: string; org?: string; json: boolean };
export type BlueprintFilesListOptions = { blueprintId: string; org?: string; json: boolean };
export type BlueprintFileUploadOptions = {
  blueprintId: string;
  filePath: string;
  name: string;
  org?: string;
  json: boolean;
};
export type BlueprintFileDeleteOptions = {
  blueprintId: string;
  fileId: string;
  org?: string;
  json: boolean;
};
export type BuildsListOptions = {
  status?: string;
  active?: boolean;
  limit?: number;
  org?: string;
  json: boolean;
};
export type BuildTriggerOptions = { yes: boolean; org?: string; json: boolean };

// builds の first 上限は 200 (OpenAPI の maximum)
const BUILDS_FIRST = 200;

const tsOrDash = (v: number | null | undefined) =>
  v === null || v === undefined ? "-" : formatTimestamp(v);

function blueprintLines(items: SnapshotBlueprint[]): string[] {
  const lines = [
    "blueprint_id\ttype\trepo_name\tsource\tcreated_at\tupdated_at\tbuild_on_default_branch_commit\treport_check_runs",
  ];
  for (const b of items) {
    lines.push(
      [
        cellText(b.blueprint_id),
        cellText(b.type),
        cellText(b.repo_name),
        cell(b.source),
        formatTimestamp(b.created_at),
        formatTimestamp(b.updated_at),
        cell(b.build_on_default_branch_commit),
        cell(b.report_check_runs),
      ].join("\t"),
    );
  }
  return lines;
}

function blueprintFileLines(items: SnapshotBlueprintFile[]): string[] {
  const lines = ["file_id\tname\tenv_var_name\tsize_bytes\tcreated_at\tupdated_at"];
  for (const f of items) {
    lines.push(
      [
        cellText(f.file_id),
        cellText(f.name),
        cellText(f.env_var_name),
        cell(f.size_bytes),
        formatTimestamp(f.created_at),
        formatTimestamp(f.updated_at),
      ].join("\t"),
    );
  }
  return lines;
}

function buildLines(items: SnapshotBuild[]): string[] {
  const lines = [
    "build_id\tstatus\ttrigger\tpinned\tcreated_at\tstarted_at\tcompleted_at\ttriggered_by_user_id",
  ];
  for (const b of items) {
    lines.push(
      [
        cellText(b.build_id),
        cellText(b.status),
        cellText(b.trigger),
        cell(b.pinned),
        formatTimestamp(b.created_at),
        tsOrDash(b.started_at),
        tsOrDash(b.completed_at),
        cellText(b.triggered_by_user_id),
      ].join("\t"),
    );
  }
  return lines;
}

// contents / logs は presigned URL を返すだけなので URL と期限を出す (中身は fetch しない)
function presignedLines(p: SnapshotPresignedDownload): string[] {
  return ["url\texpires_at", [cellText(p.url), formatTimestamp(p.expires_at)].join("\t")];
}

// void を返す DELETE 系。stdout は空にして確認は stderr に出す
const emitVoid = (asJson: boolean, note: string): number => {
  if (asJson) {
    json({ ok: true });
    return 0;
  }
  process.stderr.write(`${note}\n`);
  return 0;
};

// --contents (inline) と --contents-file (パス) は排他。file 優先で読んで UTF-8 文字列にする
function readContents(o: { contents?: string; contentsFile?: string }): string | undefined {
  if (o.contents !== undefined && o.contentsFile !== undefined)
    die("--contents と --contents-file は同時に指定できない", 2);
  if (o.contentsFile !== undefined) {
    try {
      return readFileSync(o.contentsFile, "utf8");
    } catch (e) {
      die(`--contents-file を読めない: ${(e as Error).message}`, 2);
    }
  }
  return o.contents;
}

const emitBlueprint = (b: SnapshotBlueprint, asJson: boolean) => {
  if (asJson) {
    json(b);
    return 0;
  }
  for (const line of blueprintLines([b])) print(line);
  return 0;
};

const emitBuild = (b: SnapshotBuild, asJson: boolean) => {
  if (asJson) {
    json(b);
    return 0;
  }
  for (const line of buildLines([b])) print(line);
  return 0;
};

export const runSnapshotBlueprintsList = guard(async (o: BlueprintsListOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await snapshotBlueprints(orgId, o.repo ? { repo_name: o.repo } : undefined);
  if (o.json) {
    json(res);
    return 0;
  }
  for (const line of blueprintLines(res.data)) print(line);
  return 0;
});

export const runSnapshotBlueprintGet = guard(async (o: IdOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await snapshotBlueprint(orgId, o.id);
  return emitBlueprint(res, o.json);
});

export const runSnapshotBlueprintCreate = guard(async (o: BlueprintWriteOptions) => {
  const orgId = await resolveOrgId(o.org);
  const contents = readContents(o);
  // spec: source='git' では contents は不可 (.devin/blueprint.yaml を repo から読む)
  if (o.source === "git" && contents !== undefined)
    die("--source git では --contents / --contents-file は使えない", 2);
  const body: CreateBody = {};
  if (contents !== undefined) body.contents = contents;
  if (o.repo) body.repo_name = o.repo;
  if (o.source) body.source = o.source as CreateBody["source"];
  const res = await snapshotBlueprintCreate(orgId, body);
  return emitBlueprint(res, o.json);
});

export const runSnapshotBlueprintUpdate = guard(async (o: BlueprintUpdateCliOptions) => {
  const orgId = await resolveOrgId(o.org);
  const contents = readContents(o);
  const body: UpdateBody = {};
  if (contents !== undefined) body.contents = contents;
  if (o.position !== undefined) body.position = o.position;
  if (o.source) body.source = o.source as UpdateBody["source"];
  if (o.buildOnDefaultBranch !== undefined)
    body.build_on_default_branch_commit = o.buildOnDefaultBranch;
  if (o.reportCheckRuns !== undefined) body.report_check_runs = o.reportCheckRuns;
  // spec: 空 body は 400。CLI 側でも先に弾く
  if (Object.keys(body).length === 0)
    die(
      "更新する項目を 1 つ以上指定する (--contents/--contents-file/--position/--source/--build-on-default-branch/--report-check-runs)",
      2,
    );
  const res = await snapshotBlueprintUpdate(orgId, o.id, body);
  return emitBlueprint(res, o.json);
});

export const runSnapshotBlueprintDelete = guard(async (o: IdOptions) => {
  const orgId = await resolveOrgId(o.org);
  await snapshotBlueprintDelete(orgId, o.id);
  return emitVoid(o.json, `deleted blueprint: ${o.id}`);
});

export const runSnapshotBlueprintContents = guard(async (o: IdOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await snapshotBlueprintContents(orgId, o.id);
  if (o.json) {
    json(res);
    return 0;
  }
  for (const line of presignedLines(res)) print(line);
  return 0;
});

export const runSnapshotBlueprintFilesList = guard(async (o: BlueprintFilesListOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await snapshotBlueprintFiles(orgId, o.blueprintId);
  if (o.json) {
    json(res);
    return 0;
  }
  for (const line of blueprintFileLines(res.data)) print(line);
  return 0;
});

export const runSnapshotBlueprintFileUpload = guard(async (o: BlueprintFileUploadOptions) => {
  const orgId = await resolveOrgId(o.org);
  const file = Bun.file(o.filePath);
  if (!(await file.exists())) die(`ファイルが無い: ${o.filePath}`, 2);
  const res = await snapshotBlueprintFileUpload(orgId, o.blueprintId, file, o.name);
  if (o.json) {
    json(res);
    return 0;
  }
  for (const line of blueprintFileLines([res])) print(line);
  return 0;
});

export const runSnapshotBlueprintFileDelete = guard(async (o: BlueprintFileDeleteOptions) => {
  const orgId = await resolveOrgId(o.org);
  await snapshotBlueprintFileDelete(orgId, o.blueprintId, o.fileId);
  return emitVoid(o.json, `deleted blueprint file: ${o.fileId}`);
});

export const runSnapshotBuildsList = guard(async (o: BuildsListOptions) => {
  const orgId = await resolveOrgId(o.org);
  const page = await collectPages(BUILDS_FIRST, o.limit, (after, first) => {
    const params: BuildsParams = { after, first };
    if (o.status) params.status = o.status as NonNullable<BuildsParams["status"]>;
    if (o.active !== undefined) params.active = o.active;
    return snapshotBuilds(orgId, params);
  });
  if (o.json) {
    json(page);
    return 0;
  }
  for (const line of buildLines(page.items)) print(line);
  return 0;
});

export const runSnapshotBuildGet = guard(async (o: IdOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await snapshotBuild(orgId, o.id);
  return emitBuild(res, o.json);
});

// POST /builds はスナップショットビルドの手動実行 = 計算リソース消費の可能性があるので --yes 必須
export const runSnapshotBuildCreate = guard(async (o: BuildTriggerOptions) => {
  if (!o.yes)
    die(
      "snapshot build の作成は計算リソースを消費する可能性がある。実行するには --yes を付ける",
      2,
    );
  const orgId = await resolveOrgId(o.org);
  const res = await snapshotBuildTrigger(orgId, {});
  return emitBuild(res, o.json);
});

export const runSnapshotBuildLogs = guard(async (o: IdOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await snapshotBuildLogs(orgId, o.id);
  if (o.json) {
    json(res);
    return 0;
  }
  for (const line of presignedLines(res)) print(line);
  return 0;
});

export const runSnapshotBuildCancel = guard(async (o: IdOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await snapshotBuildCancel(orgId, o.id);
  return emitBuild(res, o.json);
});

export const runSnapshotBuildPin = guard(async (o: IdOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await snapshotBuildPin(orgId, o.id, {});
  return emitBuild(res, o.json);
});

export const runSnapshotBuildUnpin = guard(async (o: IdOptions) => {
  const orgId = await resolveOrgId(o.org);
  await snapshotBuildUnpin(orgId, o.id);
  return emitVoid(o.json, `unpinned build: ${o.id}`);
});
