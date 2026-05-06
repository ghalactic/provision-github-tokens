import { createDownloadArtifact } from "./e2e.js";
import {
  createTestOctokit,
  createTestOctokitWithToken,
  type TestOctokit,
  type WorkflowRun,
} from "./octokit.js";

export type GitHubActionsContext = {
  downloadArtifact: DownloadArtifact;
  eventName: string;
  fixturesOctokit: TestOctokit;
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

export type DownloadArtifact = (
  run: WorkflowRun,
  artifactName: string,
) => Promise<Buffer>;

export function getGhaContext(): GitHubActionsContext {
  const {
    FIXTURES_GITHUB_TOKEN: fixturesToken = "",
    GITHUB_EVENT_NAME: eventName = "",
    GITHUB_HEAD_REF: headRef = "",
    GITHUB_REF_NAME: refName = "",
    GITHUB_REF: ref = "",
    GITHUB_REPOSITORY: slug = "",
    GITHUB_RUN_ID: runId = "",
    GITHUB_SHA: sha = "",
    GITHUB_RUN_ATTEMPT: runAttempt = "",
    GITHUB_TOKEN: token = "",
  } = process.env;

  const [owner, repo] = slug.split("/");
  const octokit = createTestOctokit();
  const fixturesOctokit = createTestOctokitWithToken(fixturesToken);
  const downloadArtifact = createDownloadArtifact(owner, repo, token);

  return {
    downloadArtifact,
    eventName,
    fixturesOctokit,
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
