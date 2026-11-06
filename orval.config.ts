import { defineConfig } from "orval";

export default defineConfig({
  devin: {
    input: "./openapi/devin-v3.yaml",
    output: {
      target: "./src/generated/api.ts",
      client: "fetch",
      mode: "tags-split",
      override: {
        mutator: { path: "./src/api/mutator.ts", name: "apiFetch" },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
});
