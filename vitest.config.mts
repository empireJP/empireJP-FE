import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirrors tsconfig's "@/*" -> "./*" so tests import the same specifiers
      // the app does.
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // jsdom, not node: most of lib/ is browser code (sessionStorage, document,
    // window.location) and the components are React.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    env: {
      // The app logs real failures at warn/error, and the tests deliberately
      // drive those paths — without this every expected failure prints a
      // scary-looking line and buries the actual assertion output.
      // lib/logger.test.ts overrides this per-test with its own re-imports.
      NEXT_PUBLIC_LOG_LEVEL: "silent",
    },
    include: ["{lib,components,app,tests}/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["lib/**", "components/**"],
      // Static mock catalogs, not logic — they are data files that happen to
      // live in lib/, and counting them drags the number around without
      // saying anything about test quality.
      exclude: ["lib/data.ts", "lib/artists.ts", "lib/dashboard.ts", "lib/types.ts"],
    },
  },
});
