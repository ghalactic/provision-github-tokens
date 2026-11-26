import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 80,
  sortImports: false,
  sortPackageJson: false,

  ignorePatterns: [
    "/dist/",
    "/out/",
    "/pnpm-lock.yaml",
    "/src/schema/generated.*",
    "testdata/",
  ],

  overrides: [
    {
      files: ["*.md"],
      options: {
        printWidth: 80,
        proseWrap: "always",
      },
    },
  ],
});
