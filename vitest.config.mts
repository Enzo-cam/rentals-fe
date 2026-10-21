import { defineConfig } from "vitest/config";

// Vitest only covers pure functions (ADR-0002). One worker (docs/agents/commands.md).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    maxWorkers: 1,
  },
});
