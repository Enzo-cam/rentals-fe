import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const PUBLIC_ENV = /NEXT_PUBLIC_[A-Z0-9_]*/g;

/** @see INV-FE-04 */
export function findForbiddenPublicEnv(text) {
  const names = text.match(PUBLIC_ENV) ?? [];
  return [
    ...new Set(
      names.filter(
        (name) => name.includes("SECRET") || name.includes("API_URL"),
      ),
    ),
  ];
}

function listFiles(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((entry) => listFiles(join(path, entry)));
}

/** Loads .env.local before the name check so a NEXT_PUBLIC_* defined only there is caught. */
function main() {
  const problems = [];
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");

  for (const file of [...listFiles("src"), "next.config.ts", ".env.example"]) {
    if (!existsSync(file)) continue;
    for (const name of findForbiddenPublicEnv(readFileSync(file, "utf8"))) {
      problems.push(`${file}: ${name}`);
    }
  }
  for (const name of findForbiddenPublicEnv(
    Object.keys(process.env).join("\n"),
  )) {
    problems.push(`environment: ${name}`);
  }

  const sentinels = ["ORIGIN_SECRET", "API_URL"]
    .map((name) => [name, process.env[name]])
    .filter(([, value]) => value && value.length >= 8);
  const staticFiles = listFiles(join(".next", "static"));
  for (const file of staticFiles) {
    const content = readFileSync(file, "latin1");
    for (const [name, value] of sentinels) {
      if (content.includes(value)) problems.push(`${file}: value of ${name}`);
    }
  }

  if (problems.length > 0) {
    console.error("check:client-env: forbidden client-side values:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(
    `check:client-env: ok (${staticFiles.length} files in .next/static, ${sentinels.length} values checked)`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
