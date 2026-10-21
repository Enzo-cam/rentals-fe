// Copies the OpenAPI contract published by rentals-be, records where it came
// from and regenerates the typed client (`pnpm api:sync`).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const backendDir = resolve(process.env.RENTALS_BE_DIR ?? "../rentals-be");
const source = resolve(backendDir, "openapi.json");

if (!existsSync(source)) {
  console.error(`api:sync: ${source} not found`);
  process.exit(1);
}

const git = (...args) =>
  execFileSync("git", ["-C", backendDir, ...args], { encoding: "utf8" }).trim();

const commit = git("rev-parse", "HEAD");
const dirty = git("status", "--porcelain", "--", "openapi.json") !== "";

copyFileSync(source, "src/api/openapi.json");
writeFileSync(
  "src/api/openapi.source.json",
  `${JSON.stringify({ repo: "rentals-be", commit, dirty }, null, 2)}\n`,
);
// Same generation as `pnpm api:gen`, run with this Node (no shell needed on Windows).
execFileSync(
  process.execPath,
  [
    "node_modules/openapi-typescript/bin/cli.js",
    "src/api/openapi.json",
    "-o",
    "src/api/schema.d.ts",
  ],
  { stdio: "inherit" },
);

console.log(`api:sync: rentals-be@${commit}${dirty ? " (dirty)" : ""}`);
