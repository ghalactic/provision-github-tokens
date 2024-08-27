import { describe } from "vitest";
import { createTestOctokit, type TestOctokit } from "./octokit.js";

export type GitHubActionsContext = {
  octokit: TestOctokit;
  owner: string;
  repo: string;
  ref: string;
  sha: string;
  runId: string;
  runAttempt: string;
};

export function underGHA(fn: (context: GitHubActionsContext) => void): void {
  const isGHA = process.env.GITHUB_ACTIONS === "true";

  (isGHA ? describe : describe.skip)("Under GitHub Actions", () => {
    if (!isGHA) return;

    const {
      GITHUB_REF: ref = "",
      GITHUB_REPOSITORY: slug = "",
      GITHUB_SHA: sha = "",
      GITHUB_RUN_ID: runId = "",
      GITHUB_RUN_ATTEMPT: runAttempt = "",
    } = process.env;

    const [owner, repo] = slug.split("/");
    const octokit = createTestOctokit();

    fn({ octokit, owner, repo, ref, sha, runId, runAttempt });
  });
}
