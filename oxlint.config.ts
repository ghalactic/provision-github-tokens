import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "vitest"],
  categories: {
    correctness: "error",
    suspicious: "error",
    perf: "error",
  },
  options: {
    typeAware: true,
  },
  env: {
    builtin: true,
  },
  ignorePatterns: ["dist", "out"],
  overrides: [
    {
      // Test fixtures, matcher expectations, and mock dispatch are untyped
      // boundaries. Removing these casts only trades this rule for
      // no-unsafe-assignment.
      files: ["__mocks__/**", "test/**", "script/**", "**/*.spec.ts"],
      rules: { "typescript/no-unsafe-type-assertion": "off" },
    },
    {
      // `__`-prefixed helpers are the documented mock API (AGENTS.md).
      files: ["__mocks__/**"],
      rules: { "no-underscore-dangle": "off" },
    },
  ],
  rules: {
    // Naming backstop. The rest of the convention lives in AGENTS.md.
    "id-match": [
      "error",
      "^\\$?_*(?:[a-z][a-zA-Z0-9]*|[A-Z][a-zA-Z0-9]*|[A-Z][A-Z0-9_]*)$",
      { properties: false, classFields: false },
    ],
    "no-console": "error",
    "no-unused-vars": [
      "error",
      { fix: { imports: "safe-fix", variables: "off" } },
    ],
    "no-useless-assignment": "error",

    // Preset rules that do not fit this codebase.
    // Avoiding shadowing forces awkward names in nested helpers.
    "no-shadow": "off",
    // GitHub requests are serialized deliberately to respect rate limits
    // and deterministic ordering.
    "no-await-in-loop": "off",

    // Core rules that the presets do not enable.
    "no-array-constructor": "error",
    "no-case-declarations": "error",
    "no-empty": "error",
    "no-fallthrough": "error",
    "no-prototype-builtins": "error",
    "no-redeclare": "error",
    "no-regex-spaces": "error",
    "no-var": "error",
    "prefer-const": "error",
    "prefer-rest-params": "error",
    "prefer-spread": "error",

    // TypeScript rules that the presets do not enable.
    "typescript/ban-ts-comment": "error",
    "typescript/no-empty-object-type": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-misused-promises": "error",
    "typescript/no-namespace": "error",
    "typescript/no-require-imports": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-function-type": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/only-throw-error": "error",
    "typescript/prefer-promise-reject-errors": "error",
    "typescript/require-await": "error",
    "typescript/restrict-plus-operands": "error",

    // Vitest rules that the presets do not enable.
    "vitest/no-disabled-tests": "warn",
    "vitest/no-identical-title": "error",
    "vitest/no-import-node-test": "error",
    "vitest/no-interpolation-in-snapshots": "error",
    "vitest/no-unneeded-async-expect-function": "error",
    "vitest/prefer-called-exactly-once-with": "error",
    "vitest/require-mock-type-parameters": "off",
  },
});
