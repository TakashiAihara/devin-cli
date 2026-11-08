import { describe, expect, test } from "bun:test";
import {
  buildDocument,
  collectUrls,
  extractFragment,
  mergeFragments,
  normalizeOperationId,
  type Fragment,
} from "../scripts/sync-openapi.ts";

const frag = (method: string, path: string, doc: Record<string, unknown>): Fragment => ({
  method,
  path,
  doc,
});

describe("collectUrls", () => {
  test("api-reference/v3 の .md URL だけを集める", () => {
    const index = [
      "- [Self](https://docs.devin.ai/api-reference/v3/self/self.md): x",
      "- [Old](https://docs.devin.ai/api-reference/v1/foo.md): y",
      "- [Not md](https://docs.devin.ai/api-reference/v3/x/y): z",
      "- [Self](https://docs.devin.ai/api-reference/v3/self/self.md): dup",
    ].join("\n");
    expect(collectUrls(index)).toEqual(["https://docs.devin.ai/api-reference/v3/self/self.md"]);
  });
});

describe("extractFragment", () => {
  test("yaml v3-openapi.yaml フェンスを method/path 付きで取り出す", () => {
    const md = [
      "# title",
      "````yaml v3-openapi.yaml GET /v3/self",
      "openapi: 3.1.0",
      "paths: {}",
      "````",
      "after",
    ].join("\n");
    const f = extractFragment(md);
    expect(f?.method).toBe("GET");
    expect(f?.path).toBe("/v3/self");
    expect(f?.doc.openapi).toBe("3.1.0");
  });

  test("フェンスが無ければ null", () => {
    expect(extractFragment("no fence here")).toBeNull();
  });
});

describe("mergeFragments", () => {
  const base = frag("GET", "/v3/a", {
    paths: { "/v3/a": { get: { operationId: "x", responses: {} } } },
    components: {
      schemas: { S: { type: "object" } },
      securitySchemes: { bearerAuth: { type: "http" } },
    },
  });

  test("同じ path の別 method は両方残る", () => {
    const post = frag("POST", "/v3/a", {
      paths: { "/v3/a": { post: { operationId: "y", responses: {} } } },
      components: { schemas: {}, securitySchemes: {} },
    });
    const m = mergeFragments([base, post]);
    expect(Object.keys(m.paths["/v3/a"] ?? {}).sort()).toEqual(["get", "post"]);
  });

  test("同じ path・method で内容が違えば失敗", () => {
    const other = frag("GET", "/v3/a", {
      paths: { "/v3/a": { get: { operationId: "z", responses: {} } } },
      components: { schemas: {}, securitySchemes: {} },
    });
    expect(() => mergeFragments([base, other])).toThrow(/不一致/);
  });

  test("同じ path・method で内容が同じなら dedupe", () => {
    const same = frag("GET", "/v3/a", {
      paths: { "/v3/a": { get: { operationId: "x", responses: {} } } },
      components: { schemas: {}, securitySchemes: {} },
    });
    const m = mergeFragments([base, same]);
    expect(Object.keys(m.paths["/v3/a"] ?? {})).toEqual(["get"]);
  });

  test("schema 名が衝突して内容が違えば失敗", () => {
    const bad = frag("GET", "/v3/b", {
      paths: {},
      components: { schemas: { S: { type: "string" } }, securitySchemes: {} },
    });
    expect(() => mergeFragments([base, bad])).toThrow(/S/);
  });
});

describe("normalizeOperationId", () => {
  test("method + path から camelCase を作る", () => {
    expect(normalizeOperationId("GET", "/v3/self")).toBe("getSelf");
    expect(normalizeOperationId("GET", "/v3/organizations/{org_id}/consumption/daily")).toBe(
      "getOrganizationsOrgIdConsumptionDaily",
    );
    expect(
      normalizeOperationId("GET", "/v3/organizations/{org_id}/consumption/daily/users/{user_id}"),
    ).toBe("getOrganizationsOrgIdConsumptionDailyUsersUserId");
    expect(normalizeOperationId("GET", "/v3/organizations/{org_id}/metrics/active-users")).toBe(
      "getOrganizationsOrgIdMetricsActiveUsers",
    );
  });
});

describe("buildDocument", () => {
  test("operationId を正規化して付与し、重複なら失敗", () => {
    const m = mergeFragments([
      frag("GET", "/v3/self", {
        paths: { "/v3/self": { get: { responses: {} } } },
        components: { schemas: {}, securitySchemes: { bearerAuth: { type: "http" } } },
      }),
    ]);
    const doc = buildDocument(m) as {
      paths: Record<string, Record<string, { operationId: string }>>;
      servers: { url: string }[];
    };
    expect(doc.paths["/v3/self"]?.get?.operationId).toBe("getSelf");
    expect(doc.servers[0]?.url).toBe("https://api.devin.ai");
  });
});
