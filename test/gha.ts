import { createTestOctokit, type TestOctokit } from "./octokit.js";

export type GitHubActionsContext = {
  eventName: string;
  headRef: string;
  octokit: TestOctokit;
  owner: string;
  ref: string;
  refName: string;
  repo: string;
  runAttempt: string;
  runId: string;
  sha: string;
};

export function getGhaContext(): GitHubActionsContext {
  const {
    GITHUB_EVENT_NAME: eventName = "",
    GITHUB_HEAD_REF: headRef = "",
    GITHUB_REF_NAME: refName = "",
    GITHUB_REF: ref = "",
    GITHUB_REPOSITORY: slug = "",
    GITHUB_RUN_ID: runId = "",
    GITHUB_SHA: sha = "",
    GITHUB_RUN_ATTEMPT: runAttempt = "",
  } = process.env;

  const [owner, repo] = slug.split("/");
  const octokit = createTestOctokit();

  return {
    eventName,
    headRef,
    octokit,
    owner,
    ref,
    refName,
    repo,
    runAttempt,
    runId,
    sha,
  };
}
