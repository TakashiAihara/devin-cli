import pkg from "../package.json" with { type: "json" };

declare const __BUILD_VERSION__: string | undefined;

export const VERSION: string =
  typeof __BUILD_VERSION__ === "string" ? __BUILD_VERSION__ : pkg.version;
