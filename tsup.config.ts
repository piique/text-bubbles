import { defineConfig, type Options } from "tsup";

const shared: Options = {
  format: ["esm", "cjs"],
  target: "es2020",
  platform: "browser",
  dts: true,
  minify: true,
  sourcemap: false,
  splitting: false,
  // Adapters import the core by package name, so it is shared (never duplicated) at runtime.
  external: ["react", "react-dom", "text-bubbles"],
};

export default defineConfig([
  { ...shared, entry: { index: "src/index.ts", element: "src/element/index.ts" }, clean: true },
  // The "use client" directive at the top of the source is preserved (Next.js App Router).
  { ...shared, entry: { react: "src/react/index.tsx" } },
]);
