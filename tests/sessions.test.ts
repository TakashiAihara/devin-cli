import { describe, expect, test } from "bun:test";
import {
  SESSION_1,
  SESSION_2,
  SESSION_3,
  SESSION_ATTACHMENTS,
  SESSION_MESSAGES,
  SESSION_TAGS,
} from "./helpers/fake-devin.ts";
import { tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

const ORG = "org-x";
const SESSIONS_PATH = `/v3/organizations/${ORG}/sessions`;
const ts = (unixSec: number) => new Date(unixSec * 1000).toISOString();

const sessionRow = (s: {
  session_id: string;
  status: string;
  status_detail?: string | null;
  title?: string | null;
  created_at: number;
  updated_at: number;
  acus_consumed: number;
  origin?: string | null;
  is_archived?: boolean;
  user_id?: string | null;
  url: string;
  tags: string[];
}) =>
  [
    s.session_id,
    s.status,
    s.status_detail ?? "-",
    (s.title ?? "").replace(/[\r\n\t]+/g, " ") || "-",
    ts(s.created_at),
    ts(s.updated_at),
    String(s.acus_consumed),
    s.origin ?? "-",
    s.is_archived === undefined ? "-" : String(s.is_archived),
    s.user_id ?? "-",
    s.url,
    s.tags.length ? s.tags.join(",") : "-",
  ].join("\t");

const SESSION_HEADER =
  "session_id\tstatus\tstatus_detail\ttitle\tcreated_at\tupdated_at\tacus_consumed\torigin\tis_archived\tuser_id\turl\ttags";

const sessionGets = () =>
  ctx.fake.log.filter((l) => l.method === "GET" && l.path === SESSIONS_PATH);

describe("sessions list", () => {
  test("cursor を辿って全件 TSV", async () => {
    const r = await ctx.run(["sessions", "list", "--org", ORG]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(SESSION_HEADER, sessionRow(SESSION_1), sessionRow(SESSION_2), sessionRow(SESSION_3)),
    );
    // 3 件を 2 件/ページで返す fake なので 2 リクエスト。2 回目は after=2
    const gets = sessionGets();
    expect(gets).toHaveLength(2);
    expect(gets[0]?.query.get("after")).toBeNull();
    expect(gets[1]?.query.get("after")).toBe("2");
    expect(gets[0]?.query.get("first")).toBe("200");
  });

  test("--limit で打ち切る (1 リクエストで済む)", async () => {
    const r = await ctx.run(["sessions", "list", "--org", ORG, "--limit", "2"]);
    expect(r.code).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines).toHaveLength(3); // header + 2
    expect(sessionGets()).toHaveLength(1);
    expect(sessionGets()[0]?.query.get("first")).toBe("2");
  });

  test("--limit が総件数を超えても has_next_page まで辿る", async () => {
    const r = await ctx.run(["sessions", "list", "--org", ORG, "--limit", "10"]);
    expect(r.code).toBe(0);
    expect(r.out.trimEnd().split("\n")).toHaveLength(4);
    expect(sessionGets()).toHaveLength(2);
  });

  test("--status はクライアント側フィルタ (全ページ取得して絞る)", async () => {
    const r = await ctx.run(["sessions", "list", "--org", ORG, "--status", "running"]);
    expect(r.code).toBe(0);
    expect(r.out.trimEnd().split("\n")).toHaveLength(2);
    expect(r.out).toContain("sess-1");
    expect(sessionGets()).toHaveLength(2); // フィルタは API に無いので全ページ取る
  });

  test("--status は繰り返し指定できる", async () => {
    const r = await ctx.run([
      "sessions",
      "list",
      "--org",
      ORG,
      "--status",
      "exit",
      "--status",
      "suspended",
    ]);
    expect(r.code).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines).toHaveLength(3); // header + sess-2 + sess-3
    expect(r.out).toContain("sess-2");
    expect(r.out).toContain("sess-3");
    expect(r.out).not.toContain("sess-1");
  });

  test("フィルタは qs パラメータになる", async () => {
    const r = await ctx.run([
      "sessions",
      "list",
      "--org",
      ORG,
      "--archived",
      "--tag",
      "bug",
      "--tag",
      "ui",
      "--origin",
      "api",
      "--user",
      "user-1",
      "--repo",
      "o/r",
      "--created-after",
      "1767000000",
      "--updated-before",
      "2026-02-01",
    ]);
    expect(r.code).toBe(0);
    const q = sessionGets()[0]?.query;
    expect(q?.get("is_archived")).toBe("true");
    expect(q?.getAll("tags")).toEqual(["bug", "ui"]);
    expect(q?.getAll("origins")).toEqual(["api"]);
    expect(q?.getAll("user_ids")).toEqual(["user-1"]);
    expect(q?.getAll("repo_names")).toEqual(["o/r"]);
    expect(q?.get("created_after")).toBe("1767000000");
    expect(q?.get("updated_before")).toBe(String(Math.floor(Date.parse("2026-02-01") / 1000)));
  });

  test("--active は is_archived=false", async () => {
    const r = await ctx.run(["sessions", "list", "--org", ORG, "--active"]);
    expect(r.code).toBe(0);
    expect(sessionGets()[0]?.query.get("is_archived")).toBe("false");
  });

  test("--archived と --active は併用できない", async () => {
    const r = await ctx.run(["sessions", "list", "--org", ORG, "--archived", "--active"]);
    expect(r.code).toBe(2);
  });

  test("--json は {items, total}", async () => {
    const r = await ctx.run(["sessions", "list", "--org", ORG, "--limit", "1", "--json"]);
    expect(r.code).toBe(0);
    const body = JSON.parse(r.out);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].session_id).toBe("sess-1");
    expect(body.total).toBe(3);
  });
});

describe("sessions get", () => {
  test("詳細を 1 行 TSV", async () => {
    const r = await ctx.run(["sessions", "get", "sess-1", "--org", ORG]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv(SESSION_HEADER, sessionRow(SESSION_1)));
    expect(
      ctx.fake.log.some((l) => l.method === "GET" && l.path === `${SESSIONS_PATH}/sess-1`),
    ).toBe(true);
  });

  test("存在しない ID は exit 1", async () => {
    const r = await ctx.run(["sessions", "get", "sess-99", "--org", ORG]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("404");
  });
});

describe("sessions messages", () => {
  test("cursor を辿って全メッセージ", async () => {
    const r = await ctx.run(["sessions", "messages", "sess-1", "--org", ORG]);
    expect(r.code).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines[0]).toBe("created_at\tsource\tusername\tuser_id\tmessage");
    expect(lines).toHaveLength(1 + SESSION_MESSAGES.length);
    // 5 件を 2 件/ページ → 3 リクエスト (after: null → 2 → 4)
    const calls = ctx.fake.log.filter(
      (l) => l.method === "GET" && l.path === `${SESSIONS_PATH}/sess-1/messages`,
    );
    expect(calls.map((c) => c.query.get("after"))).toEqual([null, "2", "4"]);
    // message 中の改行は TSV のため 1 行に潰れる
    expect(lines[1]).toContain("devin reply 1 with details");
    expect(lines[2]).toContain("user message 2");
  });

  test("--limit で打ち切る", async () => {
    const r = await ctx.run(["sessions", "messages", "sess-1", "--org", ORG, "--limit", "3"]);
    expect(r.code).toBe(0);
    expect(r.out.trimEnd().split("\n")).toHaveLength(4);
  });

  test("--json は {items, total}", async () => {
    const r = await ctx.run(["sessions", "messages", "sess-1", "--org", ORG, "--json"]);
    expect(r.code).toBe(0);
    const body = JSON.parse(r.out);
    expect(body.items).toHaveLength(SESSION_MESSAGES.length);
    expect(body.total).toBe(SESSION_MESSAGES.length);
  });
});

describe("sessions insights", () => {
  test("ID なしは組織全体の一覧 (ページネーション)", async () => {
    const r = await ctx.run(["sessions", "insights", "--org", ORG]);
    expect(r.code).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines[0]).toBe(
      "session_id\tstatus\tstatus_detail\tsession_size\tcategory\tacus_consumed\tnum_user_messages\tnum_devin_messages\tanalysis_status\ttitle\tcreated_at\tupdated_at\turl",
    );
    expect(lines).toHaveLength(4);
    expect(r.out).toContain("sess-1");
    expect(r.out).toContain("sess-2");
    expect(r.out).toContain("sess-3");
    const calls = ctx.fake.log.filter(
      (l) => l.method === "GET" && l.path === `${SESSIONS_PATH}/insights`,
    );
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  test("ID 指定は単一セッション", async () => {
    const r = await ctx.run(["sessions", "insights", "sess-2", "--org", ORG]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("sess-2");
    expect(r.out).toContain("Add tests");
    expect(
      ctx.fake.log.some((l) => l.method === "GET" && l.path === `${SESSIONS_PATH}/sess-2/insights`),
    ).toBe(true);
  });

  test("ID 指定時にフィルタは exit 2", async () => {
    const r = await ctx.run(["sessions", "insights", "sess-1", "--org", ORG, "--limit", "2"]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("フィルタ");
  });

  test("--json (一覧) は {items, total}", async () => {
    const r = await ctx.run(["sessions", "insights", "--org", ORG, "--json"]);
    expect(r.code).toBe(0);
    const body = JSON.parse(r.out);
    expect(body.items).toHaveLength(3);
    expect(body.items[0].session_id).toBe("sess-1");
  });

  test("--json (単一) は SessionInsightsResponse", async () => {
    const r = await ctx.run(["sessions", "insights", "sess-1", "--org", ORG, "--json"]);
    expect(r.code).toBe(0);
    const body = JSON.parse(r.out);
    expect(body.session_id).toBe("sess-1");
    expect(body.session_size).toBe("m");
    expect(body.analysis_status).toBe("completed");
  });
});

describe("sessions attachments", () => {
  test("添付一覧 TSV", async () => {
    const r = await ctx.run(["sessions", "attachments", "sess-1", "--org", ORG]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        "attachment_id\tname\tcontent_type\tsource\turl",
        "att-1\tscreenshot.png\timage/png\tuser\thttps://files.example.com/att-1",
        "att-2\tlog.txt\ttext/plain\tdevin\thttps://files.example.com/att-2",
      ),
    );
  });

  test("--json は配列", async () => {
    const r = await ctx.run(["sessions", "attachments", "sess-1", "--org", ORG, "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(SESSION_ATTACHMENTS);
  });
});

describe("sessions create", () => {
  test("SessionCreateRequest を POST して結果を返す", async () => {
    const r = await ctx.run([
      "sessions",
      "create",
      "--org",
      ORG,
      "--prompt",
      "fix the bug",
      "--title",
      "My task",
      "--repo",
      "o/r",
      "--tag",
      "t1",
      "--tag",
      "t2",
      "--mode",
      "fast",
      "--max-acu",
      "5",
    ]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.method === "POST" && l.path === SESSIONS_PATH);
    expect(call?.body).toEqual({
      prompt: "fix the bug",
      title: "My task",
      repos: ["o/r"],
      tags: ["t1", "t2"],
      devin_mode: "fast",
      max_acu_limit: 5,
    });
    expect(r.out).toContain("sess-new");
    expect(r.out).toContain("My task");
  });

  test("--prompt 無しは exit 2 (API を叩かない)", async () => {
    const r = await ctx.run(["sessions", "create", "--org", ORG]);
    expect(r.code).toBe(2);
    expect(ctx.fake.log.filter((l) => l.method === "POST")).toHaveLength(0);
  });

  test("--json は SessionResponse", async () => {
    const r = await ctx.run(["sessions", "create", "--org", ORG, "--prompt", "p", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).session_id).toBe("sess-new");
  });
});

describe("sessions archive", () => {
  test("POST archive して is_archived=true の行を返す", async () => {
    const r = await ctx.run(["sessions", "archive", "sess-1", "--org", ORG]);
    expect(r.code).toBe(0);
    expect(
      ctx.fake.log.some((l) => l.method === "POST" && l.path === `${SESSIONS_PATH}/sess-1/archive`),
    ).toBe(true);
    const row = r.out.trimEnd().split("\n")[1];
    expect(row).toContain("sess-1");
    expect(row?.split("\t")[8]).toBe("true"); // is_archived 列
  });
});

describe("sessions tags", () => {
  test("get はタグ一覧", async () => {
    const r = await ctx.run(["sessions", "tags", "get", "sess-1", "--org", ORG]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(tsv("tag", ...SESSION_TAGS));
    expect(
      ctx.fake.log.some((l) => l.method === "GET" && l.path === `${SESSIONS_PATH}/sess-1/tags`),
    ).toBe(true);
  });

  test("add は POST で追記 (重複は API 側で除かれる)", async () => {
    const r = await ctx.run(["sessions", "tags", "add", "sess-1", "new", "bug", "--org", ORG]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) => l.method === "POST" && l.path === `${SESSIONS_PATH}/sess-1/tags`,
    );
    expect(call?.body).toEqual({ tags: ["new", "bug"] });
    // fake は既存 tags とマージして返す
    expect(r.out).toBe(tsv("tag", "bug", "backend", "new"));
  });

  test("set は PUT で全置換", async () => {
    const r = await ctx.run(["sessions", "tags", "set", "sess-1", "only", "--org", ORG]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) => l.method === "PUT" && l.path === `${SESSIONS_PATH}/sess-1/tags`,
    );
    expect(call?.body).toEqual({ tags: ["only"] });
    expect(r.out).toBe(tsv("tag", "only"));
  });

  test("set はタグ 0 個で全削除", async () => {
    const r = await ctx.run(["sessions", "tags", "set", "sess-1", "--org", ORG]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find(
      (l) => l.method === "PUT" && l.path === `${SESSIONS_PATH}/sess-1/tags`,
    );
    expect(call?.body).toEqual({ tags: [] });
    expect(r.out).toBe(tsv("tag"));
  });

  test("add はタグ必須", async () => {
    const r = await ctx.run(["sessions", "tags", "add", "sess-1", "--org", ORG]);
    expect(r.code).toBe(2);
  });
});

describe("sessions delete", () => {
  test("--yes 無しは dry-run で exit 2 (DELETE を送らない)", async () => {
    const r = await ctx.run(["sessions", "delete", "sess-1", "--org", ORG]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("dry-run");
    expect(r.err).toContain("sess-1");
    expect(r.err).toContain("--yes");
    // dry-run は GET だけ。DELETE は飛んでいない
    expect(ctx.fake.log.some((l) => l.method === "DELETE")).toBe(false);
    expect(
      ctx.fake.log.some((l) => l.method === "GET" && l.path === `${SESSIONS_PATH}/sess-1`),
    ).toBe(true);
  });

  test("--yes で DELETE を実行", async () => {
    const r = await ctx.run(["sessions", "delete", "sess-1", "--org", ORG, "--yes"]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.method === "DELETE");
    expect(call?.path).toBe(`${SESSIONS_PATH}/sess-1`);
    expect(call?.query.get("archive")).toBeNull();
    expect(r.out).toContain("sess-1");
  });

  test("--archive は query に載る", async () => {
    const r = await ctx.run(["sessions", "delete", "sess-1", "--org", ORG, "--yes", "--archive"]);
    expect(r.code).toBe(0);
    const call = ctx.fake.log.find((l) => l.method === "DELETE");
    expect(call?.query.get("archive")).toBe("true");
  });
});
