import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import artifactClient from "@actions/artifact";
import { expect, it } from "vitest";
import {
  createWorkflowRun,
  E2E_TIMEOUT,
  getDefaultBranchSha,
  waitForWorkflowRunToComplete,
  type WorkflowDispatchOptions,
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

    const options: WorkflowDispatchOptions = {
      octokit: ghaContext.octokit,
      owner,
      repo,
      sha,
      workflowId: PROVIDER_WORKFLOW_ID,
      branchPrefix: "provider",
    };

    const run = await createWorkflowRun(onTestFinished, ghaContext, options);
    const conclusion = await waitForWorkflowRunToComplete(
      ghaContext.octokit,
      owner,
      repo,
      run,
    );

    // The workflow succeeds due to continue-on-error: true even though
    // the action itself may fail from unauthorized consumer requests
    expect(conclusion).toBe("success");

    // Download the summary artifact
    const { artifact } = await artifactClient.getArtifact("summary.md", {
      findBy: {
        token: process.env.GITHUB_TOKEN!,
        workflowRunId: run.id,
        repositoryName: repo,
        repositoryOwner: owner,
      },
    });

    const downloadDir = await mkdtemp(join(tmpdir(), "e2e-summary-"));
    await artifactClient.downloadArtifact(artifact.id, {
      path: downloadDir,
      findBy: {
        token: process.env.GITHUB_TOKEN!,
        workflowRunId: run.id,
        repositoryName: repo,
        repositoryOwner: owner,
      },
    });

    const summaryContent = await readFile(
      join(downloadDir, "summary.md"),
      "utf-8",
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

    const options: WorkflowDispatchOptions = {
      octokit: fixturesOctokit,
      owner: CONSUMER_OWNER,
      repo: CONSUMER_REPO,
      sha,
      workflowId: CONSUMER_WORKFLOW_ID,
      branchPrefix: "consumer",
    };

    const run = await createWorkflowRun(onTestFinished, ghaContext, options);
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
