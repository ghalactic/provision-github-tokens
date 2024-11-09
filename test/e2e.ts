import { sleep } from "./async.js";
import type { GitHubActionsContext } from "./gha.js";
import type { Reference, WorkflowRun } from "./octokit.js";

export const E2E_TIMEOUT = 3 * 60 * 1000; // 3 minutes
const WAIT_INTERVAL = 15 * 1000; // 15 seconds
const WAIT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const SELF_WORKFLOW_ID = "run-action-for-ci.yml";

export async function createSelfRunWorkflow(
  cleanup: Cleanup,
  context: GitHubActionsContext,
  label: string,
): Promise<WorkflowRun> {
  const selfRunRef = await createSelfRunRef(cleanup, context, label);
  const existingRun = await findSelfRun(context, selfRunRef);

  if (existingRun) {
    throw new Error(
      `Self run ${selfRunRef.ref} already exists: ${existingRun.html_url}`,
    );
  }

  await dispatchSelfRun(context, selfRunRef);

  return waitFor("self run", async () => {
    const run = await findSelfRun(context, selfRunRef);
    if (!run) throw new Error(`Self run ${selfRunRef.ref} not found`);
    return run;
  });
}

export async function waitForWorkflowRunToSucceed(
  { octokit, owner, repo }: GitHubActionsContext,
  run: WorkflowRun,
): Promise<void> {
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
    if (conclusion !== "success") {
      throw new Error(
        `Workflow run ${run.html_url} concluded with ${conclusion}`,
      );
    }
  });
}

/**
 * Create a branch with the same SHA as the current workflow run.
 */
async function createSelfRunRef(
  cleanup: Cleanup,
  { octokit, owner, repo, sha, runId, runAttempt }: GitHubActionsContext,
  label: string,
): Promise<Reference> {
  const refName = `heads/ci-${runId}-${runAttempt}-${label}`;
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

async function findSelfRun(
  { octokit, owner, repo, sha }: GitHubActionsContext,
  selfRunRef: Reference,
): Promise<WorkflowRun | undefined> {
  const {
    data: {
      workflow_runs: [run],
    },
  } = await octokit.rest.actions.listWorkflowRuns({
    owner,
    repo,
    event: "workflow_dispatch",
    workflow_id: SELF_WORKFLOW_ID,
    branch: selfRunRef.ref.replace(/^refs\/heads\//, ""),
    head_sha: sha,
    per_page: 1,
  });

  return run;
}

async function dispatchSelfRun(
  { octokit, owner, repo }: GitHubActionsContext,
  selfRunRef: Reference,
): Promise<void> {
  await octokit.rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: SELF_WORKFLOW_ID,
    ref: selfRunRef.ref,
  });
}

async function waitFor<T>(
  description: string,
  fn: () => Promise<T>,
): Promise<T> {
  const signal = AbortSignal.timeout(WAIT_TIMEOUT);
  let cause: unknown;

  try {
    return await Promise.race([
      (async () => {
        while (true) {
          await sleep(WAIT_INTERVAL);
          signal.throwIfAborted();

          try {
            return await fn();
          } catch (error) {
            cause = error;
          }
        }
      })(),
      new Promise<never>((_, reject) => {
        if (signal.aborted) {
          reject(signal.reason);

          return;
        }

        signal.addEventListener(
          "abort",
          () => {
            reject(signal.reason);
          },
          { once: true },
        );
      }),
    ]);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(`Timed out waiting for ${description}`, { cause });
    }

    throw error;
  }
}

/**
 * A function (afterAll/afterEach/onTestFinished) that can be used to register
 * cleanup callbacks.
 */
type Cleanup = (fn: () => Promise<void>) => void;
