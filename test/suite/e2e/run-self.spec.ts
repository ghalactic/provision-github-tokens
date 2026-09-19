import { join } from "node:path";
import { expect, it } from "vitest";
import {
  DASHBOARD_LABEL,
  FAILURE_DASHBOARD_TITLE,
} from "../../../src/dashboard.js";
import {
  createWorkflowRun,
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

it(
  "provider workflow produces expected summary",
  { concurrent: false, timeout: E2E_TIMEOUT },
  async ({ onTestFinished }) => {
    const { owner, repo, sha, downloadArtifact } = ghaContext;

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

    await expect(
      (await downloadArtifact(run, "summary.md")).toString("utf-8"),
    ).toMatchFileSnapshot(join(fixturesPath, "summary.md"));
  },
);

it(
  "provider workflow reconciles per-requester dashboards",
  { concurrent: false, timeout: E2E_TIMEOUT },
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

    // The run reconciles one dashboard per requester repo: this repo
    // disables dashboards, while the consumer deliberately requests
    // unauthorized provisions, so it keeps a failure dashboard that names
    // them.
    const consumerIssues =
      await ghaContext.fixturesOctokit.rest.issues.listForRepo({
        owner: CONSUMER_OWNER,
        repo: CONSUMER_REPO,
        state: "open",
        labels: DASHBOARD_LABEL,
      });
    expect(consumerIssues.data).toHaveLength(1);
    expect(consumerIssues.data[0]).toMatchObject({
      title: FAILURE_DASHBOARD_TITLE,
    });
    expect(consumerIssues.data[0].body ?? "").toContain(
      "UNAUTHORIZED_PROVISION",
    );
  },
);

it(
  "consumer can use provisioned token",
  { concurrent: false, timeout: E2E_TIMEOUT },
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
);
