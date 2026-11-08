import { formatIsoUtc } from "../dates.ts";
import { cursorPages } from "../api/paginate.ts";
import {
  createKnowledgeNote,
  deleteKnowledgeNote,
  knowledgeFolders,
  knowledgeNote,
  knowledgeNotes,
  updateKnowledgeNote,
  type FolderTreeResponse,
  type GetOrganizationsOrgIdKnowledgeNotesParams,
  type KnowledgeNoteCreateRequest,
  type KnowledgeNoteResponse,
} from "../api/endpoints.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cellText, die, enabledDisabled, guard, json, print } from "../lib.ts";
import { readInputFile } from "./input.ts";

export type NotesFoldersOptions = { org?: string; json: boolean };
export type NotesListOptions = {
  org?: string;
  json: boolean;
  limit?: number;
  folder?: string;
  search?: string;
  pinnedRepo?: string;
};
export type NoteIdOptions = { noteId: string; org?: string; json: boolean };
export type NoteBodyOptions = { body?: string; bodyFile?: string };
export type NoteCreateOptions = NoteBodyOptions & {
  org?: string;
  json: boolean;
  title?: string;
  trigger?: string;
  folderId?: string;
  pinnedRepo?: string;
  enabled?: boolean;
  disabled?: boolean;
};
export type NoteUpdateOptions = NoteBodyOptions & {
  noteId: string;
  org?: string;
  json: boolean;
  title?: string;
  trigger?: string;
  folderId?: string;
  clearFolder?: boolean;
  pinnedRepo?: string;
  clearPinnedRepo?: boolean;
  enabled?: boolean;
  disabled?: boolean;
};

// --body <text> / --body-file <path> ("-" = stdin) のどちらか一方を本文として読む
function noteBody(o: NoteBodyOptions): string | undefined {
  if (o.body !== undefined && o.bodyFile !== undefined)
    die("--body と --body-file は同時に指定できない", 2);
  if (o.bodyFile !== undefined) return readInputFile(o.bodyFile, "--body-file");
  return o.body;
}

// folders の応答は木構造をクライアント側で組み立てる前提のフラットな一覧 + root の note 数。
// root は folder_id を持たない note の集まりなので、最終行に (root) として件数を出す
const FOLDER_HEADER = "folder_id\tname\tpath\tnote_count\tparent_folder_id";
function folderLines(tree: FolderTreeResponse): string[] {
  const lines = [FOLDER_HEADER];
  const folders = tree.folders.toSorted((a, b) => a.path.localeCompare(b.path));
  for (const f of folders)
    lines.push(
      [
        cellText(f.folder_id),
        cellText(f.name),
        cellText(f.path),
        f.note_count,
        cellText(f.parent_folder_id),
      ].join("\t"),
    );
  lines.push(["-", "(root)", "-", tree.root_note_count, "-"].join("\t"));
  return lines;
}

const NOTE_LIST_HEADER =
  "note_id\tname\tfolder_id\tfolder_path\ttrigger\tis_enabled\tpinned_repo\tmacro\taccess_type\tupdated_at";
function noteListLines(notes: KnowledgeNoteResponse[]): string[] {
  const lines = [NOTE_LIST_HEADER];
  for (const n of notes)
    lines.push(
      [
        cellText(n.note_id),
        cellText(n.name),
        cellText(n.folder_id),
        cellText(n.folder_path),
        cellText(n.trigger),
        cellText(n.is_enabled),
        cellText(n.pinned_repo),
        cellText(n.macro),
        cellText(n.access_type),
        formatIsoUtc(n.updated_at),
      ].join("\t"),
    );
  return lines;
}

// 単体の note。body は markdown で複数行になり得るので最後の列にそのまま出す
const NOTE_DETAIL_HEADER =
  "note_id\tname\tfolder_id\tfolder_path\ttrigger\tis_enabled\tpinned_repo\tmacro\taccess_type\torg_id\tcreated_at\tupdated_at\tbody";
function noteDetailLines(n: KnowledgeNoteResponse): string[] {
  return [
    NOTE_DETAIL_HEADER,
    [
      cellText(n.note_id),
      cellText(n.name),
      cellText(n.folder_id),
      cellText(n.folder_path),
      cellText(n.trigger),
      cellText(n.is_enabled),
      cellText(n.pinned_repo),
      cellText(n.macro),
      cellText(n.access_type),
      cellText(n.org_id),
      formatIsoUtc(n.created_at),
      formatIsoUtc(n.updated_at),
      n.body,
    ].join("\t"),
  ];
}

const emitNote = (n: KnowledgeNoteResponse, asJson: boolean): number => {
  if (asJson) {
    json(n);
    return 0;
  }
  for (const line of noteDetailLines(n)) print(line);
  return 0;
};

const emitNotes = (notes: KnowledgeNoteResponse[], asJson: boolean): number => {
  if (asJson) {
    json({ items: notes });
    return 0;
  }
  for (const line of noteListLines(notes)) print(line);
  return 0;
};

export const runNotesFolders = guard(async (o: NotesFoldersOptions) => {
  const orgId = await resolveOrgId(o.org);
  const tree = await knowledgeFolders(orgId);
  if (o.json) {
    json(tree);
    return 0;
  }
  for (const line of folderLines(tree)) print(line);
  return 0;
});

export const runNotesList = guard(async (o: NotesListOptions) => {
  const params: GetOrganizationsOrgIdKnowledgeNotesParams = {
    folder_path: o.folder,
    search: o.search,
    pinned_repo: o.pinnedRepo,
  };
  const orgId = await resolveOrgId(o.org);
  const items = await cursorPages(
    (after, first) => knowledgeNotes(orgId, { ...params, after, first }),
    o.limit,
  );
  return emitNotes(items, o.json);
});

export const runNotesGet = guard(async (o: NoteIdOptions) => {
  const orgId = await resolveOrgId(o.org);
  const note = await knowledgeNote(orgId, o.noteId);
  return emitNote(note, o.json);
});

export const runNotesCreate = guard(async (o: NoteCreateOptions) => {
  const bodyText = noteBody(o);
  const missing = [
    ["--title", o.title],
    ["--body/--body-file", bodyText],
    ["--trigger", o.trigger],
  ]
    .filter(([, v]) => v === undefined || v === "")
    .map(([k]) => k);
  if (missing.length > 0) return die(`必須オプションが無い: ${missing.join(", ")}`, 2);
  const en = enabledDisabled(o);
  const body: KnowledgeNoteCreateRequest = {
    name: o.title as string,
    body: bodyText as string,
    trigger: o.trigger as string,
  };
  if (o.folderId !== undefined) body.folder_id = o.folderId;
  if (o.pinnedRepo !== undefined) body.pinned_repo = o.pinnedRepo;
  if (en !== undefined) body.is_enabled = en;
  const orgId = await resolveOrgId(o.org);
  const note = await createKnowledgeNote(orgId, body);
  return emitNote(note, o.json);
});

export const runNotesUpdate = guard(async (o: NoteUpdateOptions) => {
  if (o.folderId !== undefined && o.clearFolder === true)
    die("--folder-id と --clear-folder は同時に指定できない", 2);
  if (o.pinnedRepo !== undefined && o.clearPinnedRepo === true)
    die("--pinned-repo と --clear-pinned-repo は同時に指定できない", 2);
  const bodyText = noteBody(o);
  const en = enabledDisabled(o);
  const changed =
    o.title !== undefined ||
    bodyText !== undefined ||
    o.trigger !== undefined ||
    o.folderId !== undefined ||
    o.clearFolder === true ||
    o.pinnedRepo !== undefined ||
    o.clearPinnedRepo === true ||
    en !== undefined;
  if (!changed) return die("更新するフィールドを 1 つ以上指定する", 2);

  const orgId = await resolveOrgId(o.org);
  // PUT は全項目の置き換えなので、現在値を取ってから指定分だけ差し替える
  const cur = await knowledgeNote(orgId, o.noteId);
  const body: KnowledgeNoteCreateRequest = {
    name: o.title ?? cur.name,
    body: bodyText ?? cur.body,
    trigger: o.trigger ?? cur.trigger,
    folder_id: o.clearFolder === true ? null : (o.folderId ?? cur.folder_id),
    pinned_repo: o.clearPinnedRepo === true ? null : (o.pinnedRepo ?? cur.pinned_repo),
    is_enabled: en ?? cur.is_enabled,
  };
  const note = await updateKnowledgeNote(orgId, o.noteId, body);
  return emitNote(note, o.json);
});

export const runNotesDelete = guard(async (o: NoteIdOptions) => {
  const orgId = await resolveOrgId(o.org);
  const note = await deleteKnowledgeNote(orgId, o.noteId);
  return emitNote(note, o.json);
});
