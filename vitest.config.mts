import { defineConfig } from "vitest/config";

/** @see docs/adr/0002-arquitectura-por-features.md (pure functions only) and docs/agents/commands.md (one worker) */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    maxWorkers: 1,
  },
});
