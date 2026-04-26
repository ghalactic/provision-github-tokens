// @ts-check
import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const namingBase = [
  { selector: "default", format: ["strictCamelCase"] },
  { selector: "import", format: null },
  { selector: "function", format: ["strictCamelCase"] },
  {
    selector: "parameter",
    modifiers: ["unused"],
    format: ["strictCamelCase"],
    leadingUnderscore: "allow",
  },
  { selector: "typeLike", format: ["StrictPascalCase"] },
  { selector: "typeProperty", format: ["strictCamelCase"] },
  {
    selector: ["objectLiteralProperty", "objectLiteralMethod"],
    format: null,
  },
];

export default defineConfig(
  globalIgnores([".makefiles", "artifacts", "dist"]),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  vitest.configs.recommended,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // typescript-eslint replaces no-undef
      "no-undef": "off",
      // Use @actions/core logging, not console
      "no-console": "error",

      // Use strict camelCase for everything except variables, which can also
      // be UPPER_CASE (e.g. for constants)
      "@typescript-eslint/naming-convention": [
        "error",
        ...namingBase,
        { selector: "variable", format: ["strictCamelCase", "UPPER_CASE"] },
      ],

      // Importing helpers from __mocks_ is useful in tests
      "vitest/no-mocks-import": "off",
    },
  },
  {
    files: ["test/**/*.ts", "__mocks__/**/*.ts"],
    rules: {
      // Relax naming convention for test files
      "@typescript-eslint/naming-convention": [
        "error",
        ...namingBase,
        { selector: "variable", format: ["camelCase", "UPPER_CASE"] },
      ],
    },
  },
);
