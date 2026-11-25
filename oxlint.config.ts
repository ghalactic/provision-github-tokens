import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "vitest"],
  categories: {
    correctness: "error",
  },
  options: {
    typeAware: true,
  },
  env: {
    builtin: true,
  },
  ignorePatterns: ["dist", "out"],
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
    "preserve-caught-error": "error",

    // Core rules that the correctness preset does not enable.
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

    // TypeScript rules that the correctness preset does not enable.
    "typescript/ban-ts-comment": "error",
    "typescript/no-empty-object-type": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-misused-promises": "error",
    "typescript/no-namespace": "error",
    "typescript/no-require-imports": "error",
    "typescript/no-unnecessary-type-assertion": "error",
    "typescript/no-unnecessary-type-constraint": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-enum-comparison": "error",
    "typescript/no-unsafe-function-type": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/only-throw-error": "error",
    "typescript/prefer-promise-reject-errors": "error",
    "typescript/require-await": "error",
    "typescript/restrict-plus-operands": "error",

    // Vitest rules that the correctness preset does not enable.
    "vitest/no-commented-out-tests": "error",
    "vitest/no-disabled-tests": "warn",
    "vitest/no-identical-title": "error",
    "vitest/no-import-node-test": "error",
    "vitest/no-interpolation-in-snapshots": "error",
    "vitest/no-unneeded-async-expect-function": "error",
    "vitest/prefer-called-exactly-once-with": "error",
    "vitest/require-mock-type-parameters": "off",
  },
});
