/* eslint-disable no-console */
import { vi } from "vitest";
import { sleep } from "./async.js";
import type { GitHubActionsContext } from "./gha.js";
import type { WorkflowDispatchData } from "./github-api.js";
import type { Reference, TestOctokit, WorkflowRun } from "./octokit.js";

export const E2E_TIMEOUT = 3 * 60 * 1000; // 3 minutes
const WAIT_INTERVAL = 15 * 1000; // 15 seconds
const WAIT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Dispatch a workflow and wait for the resulting run to appear.
 */
export async function createWorkflowRun(
  cleanup: Cleanup,
  context: GitHubActionsContext,
  options: {
    octokit: TestOctokit;
    owner: string;
    repo: string;
    sha: string;
    workflowId: string;
    branchPrefix: string;
  },
): Promise<WorkflowRun> {
  const { octokit, owner, repo, sha, workflowId, branchPrefix } = options;
  const branchSuffix = buildBranchSuffix(context);
  const inputs = { label: buildRunLabel(context) };
  const runRef = await createRunRef(
    cleanup,
    octokit,
    owner,
    repo,
    context,
    sha,
    `${branchPrefix}-${branchSuffix}`,
  );
  const dispatchedRun = await dispatchRun(
    octokit,
    owner,
    repo,
    workflowId,
    runRef,
    inputs,
  );

  return waitFor(`${workflowId} run`, async () => {
    const { data } = await octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id: dispatchedRun.workflow_run_id,
    });

    return data;
  });
}

/**
 * Poll a workflow run until it reaches "completed" status.
 */
export async function waitForWorkflowRunToComplete(
  octokit: TestOctokit,
  owner: string,
  repo: string,
  run: WorkflowRun,
): Promise<string | null> {
  return waitFor("workflow run to complete", async () => {
    const {
      data: { status, conclusion },
    } = await octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id: run.id,
    });

    if (status !== "completed") {
      throw new Error(`Workflow run ${run.html_url} is ${status}`);
    }

    return conclusion;
  });
}

/**
 * Resolve the HEAD SHA of a repository's default branch.
 */
export async function getDefaultBranchSha(
  octokit: TestOctokit,
  owner: string,
  repo: string,
): Promise<string> {
  const { data } = await octokit.rest.repos.get({ owner, repo });
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${data.default_branch}`,
  });

  return ref.object.sha;
}

/**
 * Create a function that downloads a named artifact from a workflow run.
 */
export function createDownloadArtifact(
  octokit: TestOctokit,
  owner: string,
  repo: string,
) {
  return async (run: WorkflowRun, artifactName: string): Promise<Buffer> => {
    const {
      data: { artifacts },
    } = await octokit.rest.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: run.id,
      name: artifactName,
      per_page: 100,
    });

    const artifact = artifacts.sort((a, b) => b.id - a.id)[0];
    if (!artifact) {
      throw new Error(`Artifact ${artifactName} not found for run ${run.id}`);
    }

    const { headers } = await octokit.rest.actions.downloadArtifact({
      owner,
      repo,
      artifact_id: artifact.id,
      archive_format: "zip",
      request: {
        redirect: "manual",
      },
    });

    const location = headers.location;
    if (!location) {
      throw new Error(`Unable to download artifact ${artifactName}`);
    }

    const response = await fetch(location);
    if (!response.ok) {
      throw new Error(`Unable to download artifact ${artifactName}`);
    }

    return Buffer.from(await response.arrayBuffer());
  };
}

function buildRunLabel(context: GitHubActionsContext): string {
  const { headRef, refName, eventName } = context;

  if (eventName === "pull_request") {
    const [prNumber] = refName.split("/");
    if (prNumber.match(/^[1-9][0-9]*$/)) return `PR #${prNumber}`;
    return headRef || refName;
  }

  return refName;
}

function buildBranchSuffix(context: GitHubActionsContext): string {
  const { headRef, refName, eventName } = context;
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

/**
 * Create a temporary branch at the given SHA for dispatching a workflow run.
 */
async function createRunRef(
  cleanup: Cleanup,
  octokit: TestOctokit,
  owner: string,
  repo: string,
  { runId, runAttempt }: GitHubActionsContext,
  sha: string,
  branchSuffix: string,
): Promise<Reference> {
  const refName = `heads/ci-${runId}-${runAttempt}-${branchSuffix}`;
  const ref = `refs/${refName}`;

  cleanup(async () => {
    try {
      await octokit.rest.git.deleteRef({ owner, repo, ref: refName });
    } catch (cause) {
      console.warn(`Failed to cleanup ref ${ref}`, { cause });
    }
  });

  const { data } = await octokit.rest.git.createRef({ owner, repo, sha, ref });

  return data;
}

async function dispatchRun(
  octokit: TestOctokit,
  owner: string,
  repo: string,
  workflowId: string,
  runRef: Reference,
  inputs: Record<string, string>,
): Promise<WorkflowDispatchData> {
  const { data } = await octokit.request(
    "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
    {
      owner,
      repo,
      workflow_id: workflowId,
      ref: runRef.ref,
      inputs,
      headers: {
        "X-GitHub-Api-Version": "2026-03-10",
      },
    },
  );

  return data;
}

async function waitFor<T>(
  description: string,
  fn: () => Promise<T>,
): Promise<T> {
  await sleep(WAIT_INTERVAL);

  try {
    return await vi.waitFor(fn, {
      timeout: WAIT_TIMEOUT,
      interval: WAIT_INTERVAL,
    });
  } catch (cause) {
    throw new Error(`Timed out waiting for ${description}`, { cause });
  }
}

/**
 * A function (afterAll/afterEach/onTestFinished) that registers cleanup
 * callbacks.
 */
type Cleanup = (fn: () => Promise<void>) => void;
