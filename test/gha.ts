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

export function getGHAContext(): GitHubActionsContext {
  const {
    GITHUB_REF: ref = "",
    GITHUB_REPOSITORY: slug = "",
    GITHUB_SHA: sha = "",
    GITHUB_RUN_ID: runId = "",
    GITHUB_RUN_ATTEMPT: runAttempt = "",
  } = process.env;

  const [owner, repo] = slug.split("/");
  const octokit = createTestOctokit();

  return { octokit, owner, repo, ref, sha, runId, runAttempt };
}
