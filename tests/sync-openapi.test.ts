import { describe, expect, test } from "bun:test";
import {
  buildDocument,
  collectUrls,
  extractFragments,
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

describe("extractFragments", () => {
  test("yaml v3-openapi.yaml フェンスを method/path 付きで取り出す", () => {
    const md = [
      "# title",
      "````yaml v3-openapi.yaml GET /v3/self",
      "openapi: 3.1.0",
      "paths: {}",
      "````",
      "after",
    ].join("\n");
    const fs = extractFragments(md);
    expect(fs).toHaveLength(1);
    expect(fs[0]?.method).toBe("GET");
    expect(fs[0]?.path).toBe("/v3/self");
    expect(fs[0]?.doc.openapi).toBe("3.1.0");
  });

  test("1 ページに複数フェンスがあれば全て返す", () => {
    const md = [
      "# title",
      "````yaml v3-openapi.yaml GET /v3/self",
      "paths: {}",
      "````",
      "説明文",
      "````yaml v3-openapi.yaml POST /v3/widgets",
      "paths: {}",
      "````",
      "tail",
    ].join("\n");
    const fs = extractFragments(md);
    expect(fs.map((f) => `${f.method} ${f.path}`)).toEqual(["GET /v3/self", "POST /v3/widgets"]);
    expect(fs[1]?.doc.paths).toEqual({});
  });

  test("フェンスが無ければ空配列", () => {
    expect(extractFragments("no fence here")).toEqual([]);
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
    expect(Object.keys(m.paths["/v3/a"] ?? {}).toSorted()).toEqual(["get", "post"]);
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

  test("schemas/securitySchemes 以外の components セクションもマージする", () => {
    const orgId = { name: "org_id", in: "path", required: true };
    const a = frag("GET", "/v3/a", {
      paths: {},
      components: {
        parameters: { OrgId: orgId },
        responses: { NotFound: { description: "not found" } },
      },
    });
    const b = frag("GET", "/v3/b", {
      paths: {},
      components: {
        parameters: { OrgId: orgId }, // 同じ内容なら dedupe
        requestBodies: { Widget: { content: { "application/json": {} } } },
        securitySchemes: { bearerAuth: { type: "http" } },
      },
    });
    const m = mergeFragments([a, b]);
    expect(m.components["parameters"]).toEqual({ OrgId: orgId });
    expect(m.components["responses"]).toEqual({ NotFound: { description: "not found" } });
    expect(m.components["requestBodies"]).toEqual({
      Widget: { content: { "application/json": {} } },
    });
    expect(m.components["securitySchemes"]).toEqual({ bearerAuth: { type: "http" } });
  });

  test("components の非 schema セクションでも内容不一致なら失敗", () => {
    const a = frag("GET", "/v3/a", {
      paths: {},
      components: { parameters: { P: { name: "a" } } },
    });
    const b = frag("GET", "/v3/b", {
      paths: {},
      components: { parameters: { P: { name: "b" } } },
    });
    expect(() => mergeFragments([a, b])).toThrow(/components\.parameters\.P/);
  });

  test("path-item 直下の非 method キー (parameters 等) を保持する", () => {
    const params = [{ name: "org_id", in: "path", required: true }];
    const get = frag("GET", "/v3/a", {
      paths: { "/v3/a": { parameters: params, get: { operationId: "g", responses: {} } } },
      components: { schemas: {}, securitySchemes: {} },
    });
    const post = frag("POST", "/v3/a", {
      paths: { "/v3/a": { parameters: params, post: { operationId: "p", responses: {} } } },
      components: { schemas: {}, securitySchemes: {} },
    });
    const m = mergeFragments([get, post]);
    const item = m.paths["/v3/a"];
    expect(item?.["parameters"]).toEqual(params);
    expect(Object.keys(item ?? {}).toSorted()).toEqual(["get", "parameters", "post"]);
  });

  test("path-item の非 method キーが fragment 間で内容不一致なら失敗", () => {
    const get = frag("GET", "/v3/a", {
      paths: {
        "/v3/a": {
          parameters: [{ name: "a" }],
          get: { operationId: "g", responses: {} },
        },
      },
      components: { schemas: {}, securitySchemes: {} },
    });
    const post = frag("POST", "/v3/a", {
      paths: {
        "/v3/a": {
          parameters: [{ name: "b" }],
          post: { operationId: "p", responses: {} },
        },
      },
      components: { schemas: {}, securitySchemes: {} },
    });
    expect(() => mergeFragments([get, post])).toThrow(/parameters/);
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

  test("path-item の非 method キーは operationId を付けずそのまま出し、components の全セクションを出す", () => {
    const parameters = [{ name: "org_id", in: "path", required: true }];
    const m = mergeFragments([
      frag("GET", "/v3/a", {
        paths: {
          "/v3/a": {
            parameters,
            get: { responses: {} },
          },
        },
        components: {
          schemas: { S: { type: "object" } },
          parameters: { P: { name: "p" } },
        },
      }),
    ]);
    const doc = buildDocument(m) as {
      paths: Record<string, Record<string, unknown>>;
      components: Record<string, unknown>;
    };
    const item = doc.paths["/v3/a"];
    expect(item?.["parameters"]).toEqual(parameters);
    const get = item?.["get"] as Record<string, unknown> | undefined;
    expect(get?.["operationId"]).toBe("getA");
    expect(Array.isArray(item?.["parameters"])).toBe(true);
    expect(doc.components["schemas"]).toEqual({ S: { type: "object" } });
    expect(doc.components["parameters"]).toEqual({ P: { name: "p" } });
  });
});
