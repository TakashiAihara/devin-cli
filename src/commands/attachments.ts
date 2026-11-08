import { existsSync, statSync } from "node:fs";
import { basename } from "node:path";
import { attachmentDownload, uploadAttachment } from "../api/endpoints.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cellText, die, guard, json, print } from "../lib.ts";

export type AttachmentUploadOptions = { file: string; org?: string; json: boolean };
export type AttachmentDownloadOptions = {
  uuid: string;
  name: string;
  out?: string;
  org?: string;
  json: boolean;
};

export const runAttachmentUpload = guard(async (o: AttachmentUploadOptions) => {
  if (!existsSync(o.file) || !statSync(o.file).isFile())
    return die(`ファイルが無いか通常ファイルでない: ${o.file}`, 2);
  const orgId = await resolveOrgId(o.org);
  const src = Bun.file(o.file);
  // multipart の filename に元の basename を載せるため File で包む (Blob 直だと "blob" になる)
  const file = new File([src], basename(o.file), {
    type: src.type || "application/octet-stream",
  });
  const res = await uploadAttachment(orgId, file);
  if (o.json) {
    json(res);
    return 0;
  }
  print("attachment_id\tname\turl");
  print([cellText(res.attachment_id), cellText(res.name), cellText(res.url)].join("\t"));
  return 0;
});

export const runAttachmentDownload = guard(async (o: AttachmentDownloadOptions) => {
  // --json はメタ情報を出す口なので、バイナリを stdout に流す既定動作とは両立しない
  if (o.json && o.out === undefined) return die("--json は --out と併用する", 2);
  const orgId = await resolveOrgId(o.org);
  const { bytes, contentType } = await attachmentDownload(orgId, o.uuid, o.name);
  if (o.out === undefined) {
    process.stdout.write(bytes);
    return 0;
  }
  try {
    await Bun.write(o.out, bytes);
  } catch (e) {
    return die(`${o.out} に書けない: ${(e as Error).message}`, 2);
  }
  if (o.json) {
    json({
      path: o.out,
      bytes: bytes.length,
      ...(contentType === null ? {} : { content_type: contentType }),
    });
    return 0;
  }
  print(`path\tbytes`);
  print(`${cellText(o.out)}\t${bytes.length}`);
  return 0;
});
