import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { apiFetch } from "../src/api/mutator.ts";
import { CommError } from "../src/lib.ts";

const API_KEY = "cog_test-key";

// このテスト専用の最小 fake。/v1/* に canned JSON を返し、受けた request を記録する
let server: ReturnType<typeof Bun.serve>;
let url: string;
const log: { path: string; auth: string | null }[] = [];

beforeEach(() => {
  log.length = 0;
  process.env.DEVIN_API_BASE_URL = "";
  process.env.DEVIN_API_KEY = API_KEY;
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const u = new URL(req.url);
      log.push({ path: u.pathname + u.search, auth: req.headers.get("authorization") });
      if (u.pathname === "/v1/ok") return Response.json({ hello: "world" });
      if (u.pathname === "/v1/problem")
        return Response.json(
          { type: "about:blank", title: "Forbidden", status: 403, detail: "no permission" },
          { status: 403 },
        );
      if (u.pathname === "/v1/unauthorized")
        return Response.json(
          { title: "Unauthorized", status: 401, detail: "bad token" },
          { status: 401 },
        );
      if (u.pathname === "/v1/title-only")
        return Response.json({ title: "Teapot", status: 418 }, { status: 418 });
      if (u.pathname === "/v1/empty") return new Response("", { status: 200 });
      if (u.pathname === "/v1/html-error")
        return new Response("<html><body>bad gateway</body></html>", { status: 502 });
      return Response.json({ error: "no route" }, { status: 404 });
    },
  });
  url = `http://127.0.0.1:${server.port}`;
});

afterEach(() => {
  server.stop(true);
  delete process.env.DEVIN_API_BASE_URL;
  delete process.env.DEVIN_API_KEY;
  delete process.env.XDG_CONFIG_HOME;
});

describe("apiFetch", () => {
  test("相対 path に base URL を前置し Bearer を付ける", async () => {
    process.env.DEVIN_API_BASE_URL = url;
    const res = await apiFetch<{ hello: string }>("/v1/ok");
    expect(res.hello).toBe("world");
    expect(log[0]?.path).toBe("/v1/ok");
    expect(log[0]?.auth).toBe(`Bearer ${API_KEY}`);
  });

  test("絶対 URL は origin を base に差し替える", async () => {
    process.env.DEVIN_API_BASE_URL = url;
    await apiFetch("https://api.devin.ai/v1/ok?x=1");
    expect(log[0]?.path).toBe("/v1/ok?x=1");
  });

  test("403 ProblemDetail は exit 1 の ExitError", async () => {
    process.env.DEVIN_API_BASE_URL = url;
    await expect(apiFetch("/v1/problem")).rejects.toMatchObject({
      code: 1,
      message: expect.stringContaining("no permission"),
    });
  });

  test("401 は exit 2 の ExitError", async () => {
    process.env.DEVIN_API_BASE_URL = url;
    await expect(apiFetch("/v1/unauthorized")).rejects.toMatchObject({ code: 2 });
  });

  test("proxy 風の 502 HTML は CommError (exit 2)", async () => {
    process.env.DEVIN_API_BASE_URL = url;
    await expect(apiFetch("/v1/html-error")).rejects.toBeInstanceOf(CommError);
  });

  test("detail が無い ProblemDetail は title に倒す", async () => {
    process.env.DEVIN_API_BASE_URL = url;
    await expect(apiFetch("/v1/title-only")).rejects.toMatchObject({
      code: 1,
      message: expect.stringContaining("Teapot"),
    });
  });

  test("200 で空 body は exit 70 の ExitError", async () => {
    process.env.DEVIN_API_BASE_URL = url;
    await expect(apiFetch("/v1/empty")).rejects.toMatchObject({ code: 70 });
  });

  test("ヘッダに使えない文字を含む API キーは exit 2 (値は出さない)", async () => {
    process.env.DEVIN_API_BASE_URL = url;
    process.env.DEVIN_API_KEY = "cog_bad\nkey";
    try {
      const err = await apiFetch("/v1/ok").catch((e: unknown) => e);
      expect(err).toMatchObject({ code: 2 });
      expect((err as Error).message).not.toContain("bad");
    } finally {
      process.env.DEVIN_API_KEY = API_KEY;
    }
  });

  test("前後の空白を含む API キーは trim して使う", async () => {
    process.env.DEVIN_API_BASE_URL = url;
    process.env.DEVIN_API_KEY = `  ${API_KEY}  `;
    try {
      const res = await apiFetch<{ hello: string }>("/v1/ok");
      expect(res.hello).toBe("world");
      expect(log[0]?.auth).toBe(`Bearer ${API_KEY}`);
    } finally {
      process.env.DEVIN_API_KEY = API_KEY;
    }
  });

  test("URL として壊れた api_base_url は exit 2", async () => {
    process.env.DEVIN_API_BASE_URL = "https://";
    await expect(apiFetch("/v1/ok")).rejects.toMatchObject({ code: 2 });
  });
});
