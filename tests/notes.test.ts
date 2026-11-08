import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { API_KEY, KNOWLEDGE_FOLDERS, startFake } from "./helpers/fake-devin.ts";
import { makeSandbox, removeSandbox, runCli, tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

const NOTE_LIST_HEADER =
  "note_id\tname\tfolder_id\tfolder_path\ttrigger\tis_enabled\tpinned_repo\tmacro\taccess_type\tupdated_at";
const NOTE_DETAIL_HEADER =
  "note_id\tname\tfolder_id\tfolder_path\ttrigger\tis_enabled\tpinned_repo\tmacro\taccess_type\torg_id\tcreated_at\tupdated_at\tbody";

describe("notes folders", () => {
  test("フォルダ一覧 TSV (path 順 + root 行)", async () => {
    const r = await ctx.run(["notes", "folders", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "folder_id\tname\tpath\tnote_count\tparent_folder_id",
        "fld-1\tDocs\tdocs\t2\t-",
        "fld-2\tRunbooks\tdocs/runbooks\t1\tfld-1",
        "fld-3\tSnippets\tsnippets\t0\t-",
        "-\t(root)\t-\t3\t-",
      ),
    );
    expect(ctx.fake.log[0]?.path).toBe("/v3/organizations/org-x/knowledge/folders");
  });

  test("--json は FolderTreeResponse をそのまま", async () => {
    const r = await ctx.run(["notes", "folders", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(KNOWLEDGE_FOLDERS);
  });
});

describe("notes list", () => {
  test("カーソルで全ページ取り TSV で出す", async () => {
    const r = await ctx.run(["notes", "list", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        NOTE_LIST_HEADER,
        "note-1\tAuth notes\tfld-1\tdocs\twhen asked about auth\ttrue\t-\t-\torg\t2026-01-02T00:00:00.000Z",
        "note-2\tBilling FAQ\t-\t\tbilling\ttrue\t-\t-\torg\t2026-01-01T00:00:00.000Z",
        "note-3\tDeploy steps\tfld-2\tdocs/runbooks\tdeploy\ttrue\torg/repo\t!deploy\torg\t2026-01-01T00:00:00.000Z",
      ),
    );
    // fake は 1 ページ 2 件なので 2 リクエスト。2 回目は after=2
    const calls = ctx.fake.log.filter((l) => l.path === "/v3/organizations/org-x/knowledge/notes");
    expect(calls).toHaveLength(2);
    expect(calls[0]?.query.get("after")).toBeNull();
    expect(calls[1]?.query.get("after")).toBe("2");
  });

  test("--limit で打ち切る", async () => {
    const r = await ctx.run(["notes", "list", "--org", "org-x", "--limit", "1"]);
    expect(r.code).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines).toHaveLength(2); // header + 1 件
    expect(lines[1]?.startsWith("note-1\t")).toBe(true);
  });

  test("--folder/--search/--pinned-repo はクエリに乗る", async () => {
    const r = await ctx.run([
      "notes",
      "list",
      "--org",
      "org-x",
      "--folder",
      "docs",
      "--search",
      "auth",
      "--pinned-repo",
      "org/repo",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.path === "/v3/organizations/org-x/knowledge/notes");
    expect(call?.query.get("folder_path")).toBe("docs");
    expect(call?.query.get("search")).toBe("auth");
    expect(call?.query.get("pinned_repo")).toBe("org/repo");
  });

  test("--json は {items: [...]} を出す", async () => {
    const r = await ctx.run(["notes", "list", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).items).toHaveLength(3);
  });
});

describe("notes get", () => {
  test("詳細 TSV。body は最終列で複数行のまま", async () => {
    const r = await ctx.run(["notes", "get", "note-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out.startsWith(`${NOTE_DETAIL_HEADER}\n`)).toBe(true);
    expect(r.out).toContain(
      "note-1\tAuth notes\tfld-1\tdocs\twhen asked about auth\ttrue\t-\t-\torg\torg-x\t2026-01-01T00:00:00.000Z\t2026-01-02T00:00:00.000Z\t# Auth",
    );
    expect(r.out.endsWith("Use SSO.\n")).toBe(true);
    expect(ctx.fake.log[0]?.path).toBe("/v3/organizations/org-x/knowledge/notes/note-1");
  });

  test("--json は生の note", async () => {
    const r = await ctx.run(["notes", "get", "note-1", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).note_id).toBe("note-1");
  });
});

describe("notes create", () => {
  test("必須オプションで POST し、作成された note を出す", async () => {
    const r = await ctx.run([
      "notes",
      "create",
      "--org",
      "org-x",
      "--title",
      "New note",
      "--body",
      "body text",
      "--trigger",
      "when x",
      "--folder-id",
      "fld-2",
      "--pinned-repo",
      "org/r",
      "--disabled",
    ]);
    expect(r.code).toBe(0);
    const post = ctx.fake.log.find(
      (l) => l.method === "POST" && l.path === "/v3/organizations/org-x/knowledge/notes",
    );
    expect(post?.body).toEqual({
      name: "New note",
      body: "body text",
      trigger: "when x",
      folder_id: "fld-2",
      pinned_repo: "org/r",
      is_enabled: false,
    });
    expect(r.out).toContain("note-new\tNew note");
    expect(r.out).toContain("false");
  });

  test("--body-file で本文をファイルから読む", async () => {
    const f = join(ctx.sb.dir, "note-body.md");
    writeFileSync(f, "# from file\n");
    const r = await ctx.run([
      "notes",
      "create",
      "--org",
      "org-x",
      "--title",
      "T",
      "--body-file",
      f,
      "--trigger",
      "tr",
    ]);
    expect(r.code).toBe(0);
    const post = ctx.fake.log.find((l) => l.method === "POST");
    expect(post?.body).toMatchObject({ body: "# from file\n" });
  });

  test("必須オプション欠落は exit 2 (API は呼ばない)", async () => {
    const r = await ctx.run(["notes", "create", "--org", "org-x", "--title", "T"]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("必須オプション");
    expect(ctx.fake.log).toHaveLength(0);
  });

  test("--enabled と --disabled の同時指定は exit 2", async () => {
    const r = await ctx.run([
      "notes",
      "create",
      "--org",
      "org-x",
      "--title",
      "T",
      "--body",
      "b",
      "--trigger",
      "t",
      "--enabled",
      "--disabled",
    ]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("--enabled");
  });
});

describe("notes update", () => {
  test("現在値を GET してから指定分をマージして PUT", async () => {
    const r = await ctx.run(["notes", "update", "note-1", "--org", "org-x", "--title", "Renamed"]);
    expect(r.code).toBe(0);
    const put = ctx.fake.log.find(
      (l) => l.method === "PUT" && l.path === "/v3/organizations/org-x/knowledge/notes/note-1",
    );
    expect(put?.body).toEqual({
      name: "Renamed",
      body: "# Auth\n\nUse SSO.",
      trigger: "when asked about auth",
      folder_id: "fld-1",
      pinned_repo: null,
      is_enabled: true,
    });
  });

  test("--clear-folder / --clear-pinned-repo / --disabled", async () => {
    const r = await ctx.run([
      "notes",
      "update",
      "note-3",
      "--org",
      "org-x",
      "--clear-folder",
      "--clear-pinned-repo",
      "--disabled",
    ]);
    expect(r.code).toBe(0);
    const put = ctx.fake.log.find((l) => l.method === "PUT");
    expect(put?.body).toMatchObject({ folder_id: null, pinned_repo: null, is_enabled: false });
  });

  test("フィールド指定なしは exit 2", async () => {
    const r = await ctx.run(["notes", "update", "note-1", "--org", "org-x"]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("更新するフィールド");
  });

  test("--folder-id と --clear-folder の同時指定は exit 2", async () => {
    const r = await ctx.run([
      "notes",
      "update",
      "note-1",
      "--org",
      "org-x",
      "--folder-id",
      "fld-1",
      "--clear-folder",
    ]);
    expect(r.code).toBe(2);
  });
});

describe("notes delete", () => {
  test("DELETE を送り、消えた note を出す", async () => {
    const r = await ctx.run(["notes", "delete", "note-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    const del = ctx.fake.log.find((l) => l.method === "DELETE");
    expect(del?.path).toBe("/v3/organizations/org-x/knowledge/notes/note-1");
    expect(r.out).toContain("note-1\tAuth notes");
  });
});

describe("notes のエラー", () => {
  test("API が 403 を返したら exit 1 + detail", async () => {
    const fake = startFake({
      statuses: {
        "/v3/organizations/org-x/knowledge/notes": {
          status: 403,
          detail: "missing ManageOrgKnowledge",
        },
      },
    });
    const sb = makeSandbox();
    try {
      const r = await runCli(sb, ["notes", "list", "--org", "org-x"], {
        DEVIN_API_BASE_URL: fake.url,
        DEVIN_API_KEY: API_KEY,
      });
      expect(r.code).toBe(1);
      expect(r.err).toContain("missing ManageOrgKnowledge");
    } finally {
      fake.stop();
      removeSandbox(sb);
    }
  });
});
