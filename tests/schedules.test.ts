import { describe, expect, test } from "bun:test";
import { API_KEY, startFake } from "./helpers/fake-devin.ts";
import { makeSandbox, removeSandbox, runCli, tsv, useFake } from "./helpers/cli.ts";

const ctx = useFake();

const SCHEDULE_LIST_HEADER =
  "schedule_id\tname\tenabled\tagent\tschedule_type\tfrequency\tinterval_count\tscheduled_at\tnotify_on\tplaybook_id\tupdated_at";
// fixture の updated_at は ISO 文字列のまま出る (ScheduleResponse は unix ではない)
const T_UPDATED = "2026-01-02T00:00:00Z";

describe("schedules list", () => {
  test("offset ページングで全件取り TSV で出す", async () => {
    const r = await ctx.run(["schedules", "list", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      tsv(
        SCHEDULE_LIST_HEADER,
        `sched-1\tWeekly report\ttrue\tdevin\trecurring\t0 9 * * 1\t1\t-\tfailure\t-\t${T_UPDATED}`,
        `sched-2\tDaily sync\tfalse\tdevin\trecurring\t0 8 * * *\t1\t-\talways\t-\t${T_UPDATED}`,
        `sched-3\tOne-off migration\ttrue\tdata_analyst\tone_time\t-\t1\t2026-02-01T00:00:00Z\tfailure\t-\t${T_UPDATED}`,
      ),
    );
    // fake は 1 ページ 2 件。2 回目は offset=2 (cursor ではなく offset 方式)
    const calls = ctx.fake.log.filter((l) => l.path === "/v3/organizations/org-x/schedules");
    expect(calls).toHaveLength(2);
    expect(calls[0]?.query.get("offset")).toBe("0");
    expect(calls[1]?.query.get("offset")).toBe("2");
    expect(calls[0]?.query.get("after")).toBeNull();
  });

  test("--limit で打ち切る", async () => {
    const r = await ctx.run(["schedules", "list", "--org", "org-x", "--limit", "1"]);
    expect(r.code).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]?.startsWith("sched-1\t")).toBe(true);
  });

  test("--json は {items: [...]} を出す", async () => {
    const r = await ctx.run(["schedules", "list", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).items).toHaveLength(3);
  });
});

describe("schedules get", () => {
  test("詳細 TSV。prompt は最終列", async () => {
    const r = await ctx.run(["schedules", "get", "sched-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("sched-1\tWeekly report\ttrue\tdevin\trecurring\t0 9 * * 1\t1");
    expect(r.out).toContain("weekly"); // tags
    expect(r.out.endsWith("generate the weekly report\n")).toBe(true);
    expect(ctx.fake.log[0]?.path).toBe("/v3/organizations/org-x/schedules/sched-1");
  });

  test("--json は生の schedule", async () => {
    const r = await ctx.run(["schedules", "get", "sched-1", "--org", "org-x", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).scheduled_session_id).toBe("sched-1");
  });
});

describe("schedules create", () => {
  test("フラグ指定で POST", async () => {
    const r = await ctx.run([
      "schedules",
      "create",
      "--org",
      "org-x",
      "--name",
      "Nightly",
      "--prompt",
      "do x",
      "--schedule-type",
      "recurring",
      "--frequency",
      "0 3 * * *",
      "--interval-count",
      "2",
      "--agent",
      "devin",
      "--notify-on",
      "always",
      "--tags",
      "a",
      "--tags",
      "b",
      "--slack-channel-id",
      "C123",
      "--bypass-approval",
      "--create-as-user-id",
      "user-9",
    ]);
    expect(r.code).toBe(0);
    const post = ctx.fake.log.find(
      (l) => l.method === "POST" && l.path === "/v3/organizations/org-x/schedules",
    );
    expect(post?.body).toEqual({
      name: "Nightly",
      prompt: "do x",
      schedule_type: "recurring",
      frequency: "0 3 * * *",
      interval_count: 2,
      agent: "devin",
      notify_on: "always",
      tags: ["a", "b"],
      slack_channel_id: "C123",
      bypass_approval: true,
      create_as_user_id: "user-9",
    });
    expect(r.out).toContain("Nightly");
  });

  test("--skill-plugin と --skill-name は skill_ref に畳む", async () => {
    const r = await ctx.run([
      "schedules",
      "create",
      "--org",
      "org-x",
      "--name",
      "T",
      "--prompt",
      "p",
      "--skill-plugin",
      "plug-1",
      "--skill-name",
      "skill-1",
    ]);
    expect(r.code).toBe(0);
    const post = ctx.fake.log.find((l) => l.method === "POST");
    expect(post?.body).toMatchObject({
      skill_ref: { plugin_identity: "plug-1", skill_name: "skill-1" },
    });
  });

  test("片方だけの skill 指定は exit 2", async () => {
    const r = await ctx.run([
      "schedules",
      "create",
      "--org",
      "org-x",
      "--name",
      "T",
      "--prompt",
      "p",
      "--skill-plugin",
      "plug-1",
    ]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("--skill-plugin");
  });

  test("name/prompt 欠落は exit 2", async () => {
    const r = await ctx.run(["schedules", "create", "--org", "org-x", "--name", "T"]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("必須フィールド");
    expect(ctx.fake.log).toHaveLength(0);
  });

  test("--body-json とフラグをマージ (フラグ優先)", async () => {
    const r = await ctx.run([
      "schedules",
      "create",
      "--org",
      "org-x",
      "--body-json",
      JSON.stringify({ name: "J", prompt: "p", frequency: "* * * * *", agent: "devin" }),
      "--agent",
      "data_analyst",
    ]);
    expect(r.code).toBe(0);
    const post = ctx.fake.log.find((l) => l.method === "POST");
    expect(post?.body).toEqual({
      name: "J",
      prompt: "p",
      frequency: "* * * * *",
      agent: "data_analyst",
    });
  });

  test("列挙外の --agent / --notify-on / --schedule-type は exit 2", async () => {
    for (const args of [
      ["--agent", "bogus"],
      ["--notify-on", "sometimes"],
      ["--schedule-type", "weekly"],
    ]) {
      const r = await ctx.run([
        "schedules",
        "create",
        "--org",
        "org-x",
        "--name",
        "T",
        "--prompt",
        "p",
        ...args,
      ]);
      expect(r.code).toBe(2);
    }
  });
});

describe("schedules update", () => {
  test("PATCH で差分を送る", async () => {
    const r = await ctx.run([
      "schedules",
      "update",
      "sched-1",
      "--org",
      "org-x",
      "--name",
      "Renamed",
      "--disabled",
      "--run-as-user-id",
      "user-2",
    ]);
    expect(r.code).toBe(0);
    const patch = ctx.fake.log.find(
      (l) => l.method === "PATCH" && l.path === "/v3/organizations/org-x/schedules/sched-1",
    );
    expect(patch?.body).toEqual({ name: "Renamed", enabled: false, run_as_user_id: "user-2" });
  });

  test("--body-json の差分", async () => {
    const r = await ctx.run([
      "schedules",
      "update",
      "sched-1",
      "--org",
      "org-x",
      "--body-json",
      JSON.stringify({ notify_on: "never" }),
    ]);
    expect(r.code).toBe(0);
    const patch = ctx.fake.log.find((l) => l.method === "PATCH");
    expect(patch?.body).toEqual({ notify_on: "never" });
  });

  test("指定なしは exit 2", async () => {
    const r = await ctx.run(["schedules", "update", "sched-1", "--org", "org-x"]);
    expect(r.code).toBe(2);
  });
});

describe("schedules delete", () => {
  test("DELETE を送り、消えた schedule を出す", async () => {
    const r = await ctx.run(["schedules", "delete", "sched-1", "--org", "org-x"]);
    expect(r.code).toBe(0);
    const del = ctx.fake.log.find((l) => l.method === "DELETE");
    expect(del?.path).toBe("/v3/organizations/org-x/schedules/sched-1");
    expect(r.out).toContain("sched-1\tWeekly report");
  });
});

describe("schedules のエラー", () => {
  test("API が 403 を返したら exit 1 + detail", async () => {
    const fake = startFake({
      statuses: {
        "/v3/organizations/org-x/schedules": {
          status: 403,
          detail: "missing ManageOrgSchedules",
        },
      },
    });
    const sb = makeSandbox();
    try {
      const r = await runCli(sb, ["schedules", "list", "--org", "org-x"], {
        DEVIN_API_BASE_URL: fake.url,
        DEVIN_API_KEY: API_KEY,
      });
      expect(r.code).toBe(1);
      expect(r.err).toContain("missing ManageOrgSchedules");
    } finally {
      fake.stop();
      removeSandbox(sb);
    }
  });
});
