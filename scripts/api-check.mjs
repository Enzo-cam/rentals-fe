import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "api-check-"));
const generated = join(dir, "schema.d.ts");
try {
  execSync(
    `pnpm exec openapi-typescript src/api/openapi.json -o "${generated}"`,
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  const normalize = (text) => text.replace(/\r\n/g, "\n");
  const expected = normalize(readFileSync(generated, "utf8"));
  const actual = normalize(readFileSync("src/api/schema.d.ts", "utf8"));
  if (expected !== actual) {
    console.error(
      "api:check: src/api/schema.d.ts is out of date. Run `pnpm api:gen`.",
    );
    process.exit(1);
  }
  console.log("api:check: src/api/schema.d.ts is up to date.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
