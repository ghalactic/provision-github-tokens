import type { Context } from "../src/context.js";

export const testContext: Context = {
  githubRef: "refs/heads/ref-a",
  githubRepository: "account-x/repo-x",
  githubRepositoryUrl: "https://github.example.com/account-x/repo-x",
  githubRunAttempt: "111",
  githubRunAttemptUrl:
    "https://github.example.com/actions/runs/123456789/attempts/111",
  githubRunId: "123456789",
  githubServerUrl: "https://github.example.com",
};
