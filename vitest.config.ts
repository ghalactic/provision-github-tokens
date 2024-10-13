import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    include: ["test/suite/**/*.spec.ts"],
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/type/**"],
    },
  },
});
