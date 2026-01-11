import { defineConfig, type TestProjectConfiguration } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/type/**"],
      reportsDirectory: "artifacts/coverage/vitest",
      reporter: ["lcov", "text"],
    },
    projects: ((isGHA) => {
      const projects: TestProjectConfiguration[] = [];

      if (isGHA) {
        projects.push({
          extends: true,
          test: {
            name: "e2e",
            include: ["test/suite/e2e/**/*.spec.ts"],
          },
        });
      }

      projects.push({
        extends: true,
        test: {
          name: "unit",
          include: ["test/suite/unit/**/*.spec.ts"],
        },
      });

      return projects;
    })(process.env.GITHUB_ACTIONS === "true"),
  },
});
