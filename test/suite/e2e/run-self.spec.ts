import { join } from "node:path";
import { expect, it } from "vitest";
import {
  createWorkflowRun,
  downloadArtifact,
  E2E_TIMEOUT,
  getDefaultBranchSha,
  waitForWorkflowRunToComplete,
} from "../../e2e.js";
import { getGhaContext } from "../../gha.js";

const ghaContext = getGhaContext();

const CONSUMER_OWNER = "ghalactic-fixtures";
const CONSUMER_REPO = "provision-github-tokens-ci-consumer";
const CONSUMER_WORKFLOW_ID = "verify-tokens.yml";
const PROVIDER_WORKFLOW_ID = "run-action-for-ci.yml";

const fixturesPath = join(import.meta.dirname, "testdata");

it.sequential(
  "provider workflow produces expected summary",
  async ({ onTestFinished }) => {
    const { owner, repo, sha } = ghaContext;

    const run = await createWorkflowRun(onTestFinished, ghaContext, {
      octokit: ghaContext.octokit,
      owner,
      repo,
      sha,
      workflowId: PROVIDER_WORKFLOW_ID,
      branchPrefix: "provider",
    });
    const conclusion = await waitForWorkflowRunToComplete(
      ghaContext.octokit,
      owner,
      repo,
      run,
    );

    // The workflow succeeds due to continue-on-error: true even though
    // the action itself may fail from unauthorized consumer requests
    expect(conclusion).toBe("success");

    const summaryContent = await downloadArtifact(
      ghaContext,
      run,
      "summary.md",
    );

    await expect(summaryContent).toMatchFileSnapshot(
      join(fixturesPath, "summary.md"),
    );
  },
  E2E_TIMEOUT,
);

it.sequential(
  "consumer can use provisioned token",
  async ({ onTestFinished }) => {
    const { fixturesOctokit } = ghaContext;

    const sha = await getDefaultBranchSha(
      fixturesOctokit,
      CONSUMER_OWNER,
      CONSUMER_REPO,
    );

    const run = await createWorkflowRun(onTestFinished, ghaContext, {
      octokit: fixturesOctokit,
      owner: CONSUMER_OWNER,
      repo: CONSUMER_REPO,
      sha,
      workflowId: CONSUMER_WORKFLOW_ID,
      branchPrefix: "consumer",
    });
    const conclusion = await waitForWorkflowRunToComplete(
      fixturesOctokit,
      CONSUMER_OWNER,
      CONSUMER_REPO,
      run,
    );

    expect(conclusion).toBe("success");
  },
  E2E_TIMEOUT,
);
