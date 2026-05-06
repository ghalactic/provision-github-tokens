import { join } from "node:path";
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

function buildRunName(): string {
  const { headRef, refName, eventName } = ghaContext;

  if (eventName === "pull_request") {
    const [prNumber] = refName.split("/");
    if (prNumber.match(/^[1-9][0-9]*$/)) return `PR #${prNumber}`;
    return headRef || refName;
  }

  return refName;
}

function buildLabel(): string {
  const { headRef, refName, eventName } = ghaContext;
  const [prNumber] = refName.split("/");

  const event = (() => {
    if (eventName === "pull_request") return "pr";
    return eventName.replace(/[^a-z]+/g, "-");
  })();

  if (!headRef) return `${event}-${refName.replace(/\//g, "-")}`;
  if (!prNumber.match(/^[1-9][0-9]*$/)) {
    return `${event}-${headRef.replace(/\//g, "-")}`;
  }
  return `${event}-${prNumber}-${headRef.replace(/\//g, "-")}`;
}

it.sequential(
  "provider workflow produces expected summary",
  async ({ onTestFinished }) => {
    const label = buildLabel();
    const { octokit, owner, repo, sha } = ghaContext;

    const options: WorkflowDispatchOptions = {
      octokit,
      owner,
      repo,
      sha,
      workflowId: PROVIDER_WORKFLOW_ID,
      label: `provider-${label}`,
      inputs: { label: buildRunName() },
    };

    const run = await createWorkflowRun(onTestFinished, ghaContext, options);
    const conclusion = await waitForWorkflowRunToComplete(
      octokit,
      owner,
      repo,
      run,
    );

    // The workflow succeeds due to continue-on-error: true even though
    // the action itself may fail from unauthorized consumer requests
    expect(conclusion).toBe("success");

    // Download the summary artifact
    const {
      data: { artifacts },
    } = await octokit.rest.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: run.id,
    });

    const summaryArtifact = artifacts.find((a) => a.name === "summary.md");
    expect(summaryArtifact).toBeDefined();

    const { data } = await octokit.rest.actions.downloadArtifact({
      owner,
      repo,
      artifact_id: summaryArtifact!.id,
      archive_format: "zip",
    });

    const summaryContent = Buffer.from(data as ArrayBuffer).toString("utf-8");

    await expect(summaryContent).toMatchFileSnapshot(
      join(fixturesPath, "summary.md"),
    );
  },
  E2E_TIMEOUT,
);

it.sequential(
  "consumer can use provisioned token",
  async ({ onTestFinished }) => {
    const label = buildLabel();
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
      label: `consumer-${label}`,
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
