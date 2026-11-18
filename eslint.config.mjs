import css from "@eslint/css";
import js from "@eslint/js";
import json from "@eslint/json";
import html from "@html-eslint/eslint-plugin";
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

import { noComments } from "./tooling/eslint/no-comments.mjs";
import { postgresql } from "./tooling/eslint/postgresql.mjs";

const local = {
  rules: { "no-comments": noComments },
  languages: { postgresql },
};

export default defineConfig(
  globalIgnores([
    "apps/client/dist/",
    "apps/server/dist/",
    "coverage/",
    "playwright-report/",
    "test-results/",
  ]),
  {
    linterOptions: { noInlineConfig: true },
  },
  {
    files: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
    extends: [js.configs.recommended],
    plugins: { local, "@stylistic": stylistic },
    rules: {
      "local/no-comments": "error",
      "@stylistic/brace-style": "error",
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/eol-last": "error",
      "@stylistic/indent": ["error", 2, { SwitchCase: 1 }],
      "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxBOF: 0, maxEOF: 0 }],
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/semi": ["error", "always"],
      "curly": ["error", "all"],
      "eqeqeq": ["error", "always"],
      "no-console": "error",
      "no-implicit-coercion": "error",
      "no-param-reassign": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["**/*.{ts,cts,mts,tsx}"],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
    },
  },
  {
    files: ["apps/client/src/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
  {
    files: ["**/*.jsx"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  {
    files: ["**/*.html"],
    extends: [html.configs.recommended],
    plugins: { local },
    language: "html/html",
    rules: {
      "local/no-comments": "error",
      "html/indent": ["error", 2],
      "html/require-meta-viewport": "error",
    },
  },
  {
    files: ["**/*.css"],
    extends: [css.configs.recommended],
    plugins: { local },
    language: "css/css",
    rules: { "local/no-comments": "error" },
  },
  {
    files: ["**/*.json"],
    ignores: ["**/package-lock.json"],
    extends: [json.configs.recommended],
    language: "json/json",
  },
  {
    files: ["**/*.sql"],
    plugins: { local },
    language: "local/postgresql",
    rules: { "local/no-comments": "error" },
  },
);
