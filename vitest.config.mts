import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/** @see docs/adr/0002-arquitectura-por-features.md (pure functions only) and docs/agents/commands.md (one worker) */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    maxWorkers: 1,
  },
});
