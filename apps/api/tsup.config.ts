import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  outDir: "dist",
  noExternal: [/^@discusscode\//],
  clean: true,
  sourcemap: true,
});
