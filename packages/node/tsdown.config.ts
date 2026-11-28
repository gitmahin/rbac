import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  platform: "neutral",
  clean: true,
  deps: {
    alwaysBundle: ["@rbac/constants", "@rbac/types"],
  },
});
