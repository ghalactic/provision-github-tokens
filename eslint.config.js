// @ts-check
import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([".makefiles", "artifacts", "dist"]),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  vitest.configs.recommended,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js"],
        },
      },
    },
    rules: {
      // Importing helpers from __mocks_ is useful in tests
      "vitest/no-mocks-import": "off",
    },
  },
);
