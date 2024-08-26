import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/suite/unit/**/*.spec.ts"],

    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/type/**"],
    },
  },
});
