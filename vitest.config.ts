import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [{ find: /^text-bubbles$/, replacement: resolve(__dirname, "src/index.ts") }],
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
