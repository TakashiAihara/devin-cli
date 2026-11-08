import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

const HEADER = "playbook_id\ttitle\tmacro\taccess_type\torg_id\tcreated_at\tupdated_at";
const ROW_1 =
  "pb-1\tMy Playbook\t!my\torg\torg-x\t2026-01-01T00:00:00.000Z\t2026-01-02T00:00:00.000Z";
const ROW_2 = "pb-2\tSecond\t-\tenterprise\t-\t2026-01-01T00:00:00.000Z\t2026-01-02T00:00:00.000Z";

describe("playbooks", () => {
  test("list は TSV で全件出す", async () => {
    const r = await ctx.run(["playbooks", "list", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv(HEADER, ROW_1, ROW_2));
  });

  test("list --json は {items, total}", async () => {
    const r = await ctx.run(["playbooks", "list", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out) as { items: { playbook_id: string }[]; total: number };
    expect(j.items.map((p) => p.playbook_id)).toEqual(["pb-1", "pb-2"]);
    expect(j.total).toBe(2);
  });

  test("list --include-enterprise は query に載る", async () => {
    await ctx.run(["playbooks", "list", "--org", "org-x", "--include-enterprise"]);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/playbooks");
    expect(call?.query.get("include_enterprise")).toBe("true");
  });

  test("get は 1 行 TSV", async () => {
    const r = await ctx.run(["playbooks", "get", "pb-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv(HEADER, ROW_1));
  });

  test("get missing は exit 1", async () => {
    const r = await ctx.run(["playbooks", "get", "missing", "--org", "org-x"]);
    expect(r.code).toBe(1);
  });

  test("create は title/body/macro を POST する", async () => {
    const r = await ctx.run([
      "playbooks",
      "create",
      "--org",
      "org-x",
      "--title",
      "New PB",
      "--body",
      "Body text",
      "--macro",
      "!new",
    ]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("pb-new");
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/playbooks");
    expect(call?.method).toBe("POST");
    expect(JSON.parse(call?.body ?? "{}")).toEqual({
      title: "New PB",
      body: "Body text",
      macro: "!new",
    });
  });

  test("create --body-file と --structured-output-schema", async () => {
    writeFileSync(join(ctx.sb.dir, "pb.md"), "file body\n");
    const r = await ctx.run([
      "playbooks",
      "create",
      "--org",
      "org-x",
      "--title",
      "T",
      "--body-file",
      "pb.md",
      "--structured-output-schema",
      '{"type":"object"}',
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/playbooks");
    const sent = JSON.parse(call?.body ?? "{}") as Record<string, unknown>;
    expect(sent.body).toBe("file body\n");
    expect(sent.structured_output_schema).toEqual({ type: "object" });
  });

  test("create は --title 無しで exit 2 (API を叩かない)", async () => {
    const r = await ctx.run(["playbooks", "create", "--org", "org-x", "--body", "b"]);
    expect(r.code).toBe(2);
    expect(ctx.fake.log.filter((l) => l.path.includes("/playbooks"))).toHaveLength(0);
  });

  test("create は --body と --body-file の併用で exit 2", async () => {
    const r = await ctx.run([
      "playbooks",
      "create",
      "--org",
      "org-x",
      "--title",
      "T",
      "--body",
      "b",
      "--body-file",
      "x",
    ]);
    expect(r.code).toBe(2);
  });

  test("create は壊れた --structured-output-schema で exit 2", async () => {
    const r = await ctx.run([
      "playbooks",
      "create",
      "--org",
      "org-x",
      "--title",
      "T",
      "--body",
      "b",
      "--structured-output-schema",
      "{oops",
    ]);
    expect(r.code).toBe(2);
  });

  test("update は PUT で全項目を送る", async () => {
    const r = await ctx.run([
      "playbooks",
      "update",
      "pb-1",
      "--org",
      "org-x",
      "--title",
      "Renamed",
      "--body",
      "New body",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/playbooks/pb-1");
    expect(call?.method).toBe("PUT");
    expect(JSON.parse(call?.body ?? "{}")).toEqual({
      title: "Renamed",
      body: "New body",
    });
  });

  test("delete は削除した playbook を返す", async () => {
    const r = await ctx.run(["playbooks", "delete", "pb-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv(HEADER, ROW_1));
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/playbooks/pb-1");
    expect(call?.method).toBe("DELETE");
  });
});
