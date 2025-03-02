import { defineConfig, type TestProjectConfiguration } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/type/**"],
    },
    workspace: ((isGHA) => {
      const projects: TestProjectConfiguration[] = [
        {
          extends: true,
          test: {
            name: "unit",
            include: ["test/suite/unit/**/*.spec.ts"],
          },
        },
      ];

      if (isGHA) {
        projects.push({
          extends: true,
          test: {
            name: "e2e",
            include: ["test/suite/e2e/**/*.spec.ts"],
          },
        });
      }

      return projects;
    })(process.env.GITHUB_ACTIONS === "true"),
  },
});
