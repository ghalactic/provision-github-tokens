/* eslint-disable no-console */
import artifactClient from "@actions/artifact";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { vi } from "vitest";
import { sleep } from "./async.js";
import type { GitHubActionsContext } from "./gha.js";
import type { Reference, TestOctokit, WorkflowRun } from "./octokit.js";

const ARTIFACTS_DIR = join(import.meta.dirname, "..", "artifacts");

export const E2E_TIMEOUT = 3 * 60 * 1000; // 3 minutes
const WAIT_INTERVAL = 15 * 1000; // 15 seconds
const WAIT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export type WorkflowDispatchOptions = {
  octokit: TestOctokit;
  owner: string;
  repo: string;
  sha: string;
  workflowId: string;
  branchPrefix: string;
};

export async function createWorkflowRun(
  cleanup: Cleanup,
  context: GitHubActionsContext,
  options: WorkflowDispatchOptions,
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
  const existingRun = await findRun(octokit, owner, repo, workflowId, runRef);

  if (existingRun) {
    throw new Error(
      `Run ${runRef.ref} already exists: ${existingRun.html_url}`,
    );
  }

  await dispatchRun(octokit, owner, repo, workflowId, runRef, inputs);

  return waitFor(`${workflowId} run`, async () => {
    const run = await findRun(octokit, owner, repo, workflowId, runRef);
    if (!run) throw new Error(`Run ${runRef.ref} not found`);
    return run;
  });
}

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

export async function downloadArtifact(
  context: GitHubActionsContext,
  run: WorkflowRun,
  artifactName: string,
): Promise<string> {
  const { owner, repo, token } = context;

  const { artifact } = await artifactClient.getArtifact(artifactName, {
    findBy: {
      token,
      workflowRunId: run.id,
      repositoryName: repo,
      repositoryOwner: owner,
    },
  });

  const downloadDir = join(ARTIFACTS_DIR, String(run.id));
  await artifactClient.downloadArtifact(artifact.id, {
    path: downloadDir,
    findBy: {
      token,
      workflowRunId: run.id,
      repositoryName: repo,
      repositoryOwner: owner,
    },
  });

  return readFile(join(downloadDir, artifactName), "utf-8");
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

async function findRun(
  octokit: TestOctokit,
  owner: string,
  repo: string,
  workflowId: string,
  runRef: Reference,
): Promise<WorkflowRun | undefined> {
  const {
    data: {
      workflow_runs: [run],
    },
  } = await octokit.rest.actions.listWorkflowRuns({
    owner,
    repo,
    event: "workflow_dispatch",
    workflow_id: workflowId,
    branch: runRef.ref.replace(/^refs\/heads\//, ""),
    per_page: 1,
  });

  return run;
}

async function dispatchRun(
  octokit: TestOctokit,
  owner: string,
  repo: string,
  workflowId: string,
  runRef: Reference,
  inputs: Record<string, string>,
): Promise<void> {
  await octokit.rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowId,
    ref: runRef.ref,
    inputs,
  });
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

type Cleanup = (fn: () => Promise<void>) => void;
