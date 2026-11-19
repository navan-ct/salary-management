import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

const workspace = fileURLToPath(new URL("../../", import.meta.url));

const allowedSubdirectories = new Map<string, readonly string[]>([
  ["", [".github", ".githooks", "apps", "conversations", "docs", "infra", "tests", "tooling"]],
  [".github", ["ISSUE_TEMPLATE", "workflows"]],
  ["apps", ["client", "server"]],
  ["apps/client", ["public", "src"]],
  ["apps/client/public", [".well-known", "assets", "fonts", "icons", "images"]],
  ["apps/client/src", ["app", "assets", "features", "shared"]],
  ["apps/client/src/app", ["layouts", "providers", "routes"]],
  ["apps/client/src/assets", ["fonts", "icons", "images"]],
  ["apps/client/src/shared", ["api", "components", "hooks", "styles", "types", "utils"]],
  ["apps/server", ["drizzle", "src"]],
  ["apps/server/drizzle", ["meta"]],
  ["apps/server/src", ["config", "db", "http", "modules", "shared"]],
  ["apps/server/src/db", ["schema", "seeds"]],
  ["apps/server/src/http", ["middleware", "routes"]],
  ["apps/server/src/shared", ["types", "utils"]],
  ["docs", ["assets"]],
  ["tests", ["architecture", "e2e", "fixtures", "helpers", "integration", "snapshots", "unit"]],
  ["tests/fixtures", ["e2e", "integration", "unit"]],
  ["tooling", ["eslint", "scripts"]],
]);

const featureSubdirectories = new Map<string, readonly string[]>([
  ["apps/client/src/features", ["api", "components", "hooks", "pages", "schemas", "state", "styles", "types", "utils"]],
  ["apps/server/src/modules", ["controllers", "domain", "jobs", "repositories", "routes", "schemas", "services", "types"]],
]);
const featureName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

const ignoredDirectories = new Set([
  ".git", "node_modules", "apps/client/node_modules", "apps/server/node_modules",
  "apps/client/dist", "apps/server/dist", "coverage", "playwright-report", "test-results",
]);

function unexpectedDirectories(relative = "", allowed = allowedSubdirectories.get(relative) ?? []): string[] {
  const featureFolders = featureSubdirectories.get(relative);

  return readdirSync(join(workspace, relative), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap(({ name }) => {
      const path = relative === "" ? name : `${relative}/${name}`;

      if (ignoredDirectories.has(path)) {
        return [];
      }

      if (allowed.includes(name)) {
        return unexpectedDirectories(path);
      }

      if (featureFolders !== undefined && featureName.test(name)) {
        return unexpectedDirectories(path, featureFolders);
      }

      return [path];
    });
}

it("keeps all project folders within the approved layout", () => {
  expect(unexpectedDirectories().sort()).toEqual([]);
});
