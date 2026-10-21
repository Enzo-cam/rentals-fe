import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const EFFECTS_MESSAGE =
  "useEffect/useLayoutEffect only live in src/lib/effects/ (INV-FE-06, docs/architecture.md §6).";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  /** INV-FE-06 with selectors: no-restricted-imports' importNames also rejects `import * as React` (shadcn/ui). */
  {
    files: ["src/**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    ignores: ["src/lib/effects/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "ImportDeclaration[source.value='react'] > ImportSpecifier[imported.name=/^(useEffect|useLayoutEffect)$/]",
          message: EFFECTS_MESSAGE,
        },
        {
          selector:
            "ImportDeclaration[source.value='react'] > ImportSpecifier[imported.value=/^(useEffect|useLayoutEffect)$/]",
          message: EFFECTS_MESSAGE,
        },
        {
          selector:
            "ExportNamedDeclaration[source.value='react'] > ExportSpecifier[local.name=/^(useEffect|useLayoutEffect)$/]",
          message: EFFECTS_MESSAGE,
        },
        {
          selector:
            "MemberExpression[property.name=/^(useEffect|useLayoutEffect)$/]",
          message: EFFECTS_MESSAGE,
        },
        {
          selector:
            "MemberExpression[computed=true][property.value=/^(useEffect|useLayoutEffect)$/]",
          message: EFFECTS_MESSAGE,
        },
        {
          selector:
            "MemberExpression[computed=true][property.quasis.0.value.cooked=/^(useEffect|useLayoutEffect)$/]",
          message: EFFECTS_MESSAGE,
        },
        {
          selector:
            "VariableDeclarator > ObjectPattern > Property[key.name=/^(useEffect|useLayoutEffect)$/]",
          message: EFFECTS_MESSAGE,
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/api/schema.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
