import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { API_KEY, PRESIGNED_BYTES } from "./helpers/fake-devin.ts";
import { tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

describe("attachments", () => {
  test("upload は multipart で送り attachment 情報を TSV で返す", async () => {
    writeFileSync(join(ctx.sb.dir, "hello.txt"), "hello world");
    const r = await ctx.run(["attachments", "upload", "hello.txt", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv("attachment_id\tname\turl", "att-1\thello.txt\thttps://files.example.com/att-1"),
    );
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/attachments");
    expect(call?.method).toBe("POST");
    // multipart は JSON でないので fake は生テキストを body に記録する
    expect(call?.body as string).toContain('filename="hello.txt"');
    expect(call?.body as string).toContain("hello world");
  });

  test("upload --json は生 JSON", async () => {
    writeFileSync(join(ctx.sb.dir, "a.bin"), "x");
    const r = await ctx.run(["attachments", "upload", "a.bin", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out) as { attachment_id: string; name: string };
    expect(j.attachment_id).toBe("att-1");
    expect(j.name).toBe("a.bin");
  });

  test("upload 無いファイルは exit 2 (API を叩かない)", async () => {
    const r = await ctx.run(["attachments", "upload", "nope.txt", "--org", "org-x"]);
    expect(r.code).toBe(2);
    expect(ctx.fake.log).toHaveLength(0);
  });

  test("download --out は 307 → presigned を辿ってバイト一致で保存する", async () => {
    const r = await ctx.run([
      "attachments",
      "download",
      "att-uuid",
      "report.pdf",
      "--out",
      "dl.bin",
      "--org",
      "org-x",
    ]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv("path\tbytes", "dl.bin\t7"));
    const bytes = new Uint8Array(await Bun.file(join(ctx.sb.dir, "dl.bin")).arrayBuffer());
    expect(Array.from(bytes)).toEqual(Array.from(PRESIGNED_BYTES));
    // 1 段目は credential 付き、2 段目 (presigned) は credential 無し
    const apiCall = ctx.fake.log.find(
      (l) => l.path === "/v3/organizations/org-x/attachments/att-uuid/report.pdf",
    );
    expect(apiCall?.auth).toBe(`Bearer ${API_KEY}`);
    const pre = ctx.fake.log.find((l) => l.path.startsWith("/presigned/"));
    expect(pre?.auth).toBeNull();
  });

  test("download --out --json は {path, bytes, content_type}", async () => {
    const r = await ctx.run([
      "attachments",
      "download",
      "att-uuid",
      "f",
      "--out",
      "d.bin",
      "--org",
      "org-x",
      "--json",
    ]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out) as { path: string; bytes: number; content_type: string };
    expect(j.path).toBe("d.bin");
    expect(j.bytes).toBe(7);
    expect(j.content_type).toBe("application/octet-stream");
  });

  test("download は --out 省略でバイナリを stdout に出す", async () => {
    const r = await ctx.run(["attachments", "download", "att-uuid", "f", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out.startsWith("PK")).toBe(true); // PRESIGNED_BYTES の先頭 0x50 0x4b
  });

  test("download --json は --out 必須で exit 2", async () => {
    const r = await ctx.run([
      "attachments",
      "download",
      "att-uuid",
      "f",
      "--org",
      "org-x",
      "--json",
    ]);
    expect(r.code).toBe(2);
    expect(ctx.fake.log).toHaveLength(0);
  });

  test("download missing は exit 1", async () => {
    const r = await ctx.run(["attachments", "download", "missing", "f", "--org", "org-x"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("404");
  });
});
