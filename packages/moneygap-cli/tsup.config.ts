import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  // Bundle local diagnostics so npm consumers don't need a file: dependency
  noExternal: ["moneygap-diagnostics"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
