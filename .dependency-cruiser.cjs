/** @see docs/architecture.md §2 @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "app-only-public-surfaces",
      comment:
        "app/ imports features/*/index.ts, components/ui, lib and api/server.ts only.",
      severity: "error",
      from: { path: "^src/app/" },
      to: {
        path: "^src/(features|api|components)/",
        pathNot: [
          "^src/features/[^/]+/index\\.ts$",
          "^src/components/ui/",
          "^src/api/server\\.ts$",
        ],
      },
    },
    {
      name: "feature-not-into-other-feature",
      comment: "A feature imports another feature only through its index.ts.",
      severity: "error",
      from: { path: "^src/features/([^/]+)/" },
      to: {
        path: "^src/features/([^/]+)/",
        pathNot: ["^src/features/$1/", "^src/features/[^/]+/index\\.ts$"],
      },
    },
    {
      name: "ui-no-features-or-api",
      comment: "components/ui has no domain: no features, no api.",
      severity: "error",
      from: { path: "^src/components/ui/" },
      to: { path: "^src/(features|api)/" },
    },
    {
      name: "lib-imports-only-lib",
      comment: "lib/ imports nothing of the project outside lib/.",
      severity: "error",
      from: { path: "^src/lib/" },
      to: { path: "^src/", pathNot: "^src/lib/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".d.ts"],
    },
  },
};
