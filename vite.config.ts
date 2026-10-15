import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const src = (path: string) => resolve(__dirname, "src", path);

// Demo / playground. `--mode e2e` also builds the Playwright fixtures page.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  root: resolve(__dirname, "demo"),
  base: "./",
  publicDir: mode === "e2e" ? false : "public",
  resolve: {
    alias: [
      { find: /^text-bubbles\/react$/, replacement: src("react/index.tsx") },
      { find: /^text-bubbles\/element$/, replacement: src("element/index.ts") },
      { find: /^text-bubbles$/, replacement: src("index.ts") },
    ],
  },
  build: {
    outDir: resolve(__dirname, mode === "e2e" ? ".e2e-dist" : "demo-dist"),
    emptyOutDir: true,
    target: "es2020",
    rollupOptions: {
      input:
        mode === "e2e"
          ? {
              index: resolve(__dirname, "demo/index.html"),
              e2e: resolve(__dirname, "demo/e2e.html"),
            }
          : resolve(__dirname, "demo/index.html"),
    },
  },
}));
