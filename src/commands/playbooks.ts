import { existsSync } from "node:fs";
import { formatIsoUtc } from "../dates.ts";
import {
  createPlaybook,
  deletePlaybook,
  playbook,
  playbooks,
  updatePlaybook,
  type Playbook,
  type PlaybookItem,
} from "../api/endpoints.ts";
import type { PlaybookCreateRequest } from "../generated/api.schemas.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cellText, die, guard, json, print } from "../lib.ts";

export type PlaybooksListOptions = {
  limit?: number;
  includeEnterprise?: boolean;
  org?: string;
  json: boolean;
};
export type PlaybookGetOptions = { playbookId: string; org?: string; json: boolean };
export type PlaybookWriteOptions = {
  title?: string;
  body?: string;
  bodyFile?: string;
  macro?: string;
  structuredOutputSchema?: string;
  org?: string;
  json: boolean;
};
export type PlaybookUpdateOptions = PlaybookWriteOptions & { playbookId: string };

const playbookLine = (p: PlaybookItem | Playbook): string =>
  [
    cellText(p.playbook_id),
    cellText(p.title),
    cellText(p.macro),
    cellText(p.access_type),
    cellText(p.org_id),
    formatIsoUtc(p.created_at),
    formatIsoUtc(p.updated_at),
  ].join("\t");

const PLAYBOOK_HEADER = "playbook_id\ttitle\tmacro\taccess_type\torg_id\tcreated_at\tupdated_at";

export const runPlaybooksList = guard(async (o: PlaybooksListOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await playbooks(orgId, { limit: o.limit, includeEnterprise: o.includeEnterprise });
  if (o.json) {
    json(res);
    return 0;
  }
  print(PLAYBOOK_HEADER);
  for (const p of res.items) print(playbookLine(p));
  return 0;
});

export const runPlaybookGet = guard(async (o: PlaybookGetOptions) => {
  const orgId = await resolveOrgId(o.org);
  const p = await playbook(orgId, o.playbookId);
  if (o.json) {
    json(p);
    return 0;
  }
  print(PLAYBOOK_HEADER);
  print(playbookLine(p));
  return 0;
});

// create / update は同じ PlaybookCreateRequest を送る (PUT は全項目置き換え)。
// title と body (本文は --body-file でも可、"-" で stdin) はどちらのコマンドでも必須
async function writeBody(o: PlaybookWriteOptions): Promise<PlaybookCreateRequest> {
  if (o.title === undefined || o.title === "") return die("--title は必須", 2);
  if (o.body !== undefined && o.bodyFile !== undefined)
    return die("--body と --body-file はどちらか一方だけ指定する", 2);
  let body = o.body;
  if (o.bodyFile !== undefined) {
    if (o.bodyFile !== "-" && !existsSync(o.bodyFile))
      return die(`--body-file のファイルが無い: ${o.bodyFile}`, 2);
    body = o.bodyFile === "-" ? await Bun.stdin.text() : await Bun.file(o.bodyFile).text();
  }
  if (body === undefined) return die("--body か --body-file は必須", 2);
  const req: PlaybookCreateRequest = { title: o.title, body };
  if (o.macro !== undefined) req.macro = o.macro === "" ? null : o.macro;
  if (o.structuredOutputSchema !== undefined) {
    let schema: unknown;
    try {
      schema = JSON.parse(o.structuredOutputSchema);
    } catch (e) {
      return die(`--structured-output-schema を JSON として読めない: ${(e as Error).message}`, 2);
    }
    if (schema !== null && (typeof schema !== "object" || Array.isArray(schema)))
      return die("--structured-output-schema は JSON object か null にする", 2);
    req.structured_output_schema = schema as PlaybookCreateRequest["structured_output_schema"];
  }
  return req;
}

export const runPlaybookCreate = guard(async (o: PlaybookWriteOptions) => {
  const orgId = await resolveOrgId(o.org);
  const p = await createPlaybook(orgId, await writeBody(o));
  if (o.json) {
    json(p);
    return 0;
  }
  print(PLAYBOOK_HEADER);
  print(playbookLine(p));
  return 0;
});

export const runPlaybookUpdate = guard(async (o: PlaybookUpdateOptions) => {
  const orgId = await resolveOrgId(o.org);
  const p = await updatePlaybook(orgId, o.playbookId, await writeBody(o));
  if (o.json) {
    json(p);
    return 0;
  }
  print(PLAYBOOK_HEADER);
  print(playbookLine(p));
  return 0;
});

export const runPlaybookDelete = guard(async (o: PlaybookGetOptions) => {
  const orgId = await resolveOrgId(o.org);
  const p = await deletePlaybook(orgId, o.playbookId);
  if (o.json) {
    json(p);
    return 0;
  }
  print(PLAYBOOK_HEADER);
  print(playbookLine(p));
  return 0;
});
