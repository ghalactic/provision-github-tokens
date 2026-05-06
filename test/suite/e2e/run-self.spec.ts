import { expect, it } from "vitest";
import {
  createWorkflowRun,
  E2E_TIMEOUT,
  waitForWorkflowRunToComplete,
} from "../../e2e.js";
import { getGhaContext } from "../../gha.js";

const ghaContext = getGhaContext();

it(
  "can run itself via workflow_dispatch",
  async ({ onTestFinished }) => {
    const { headRef, refName, octokit, owner, repo, sha } = ghaContext;
    const [prNumber] = refName.split("/");

    const eventName = (() => {
      if (ghaContext.eventName === "pull_request") return "pr";
      return ghaContext.eventName.replace(/[^a-z]+/g, "-");
    })();

    const label = (() => {
      if (!headRef) return `${eventName}-${refName.replace(/\//g, "-")}`;
      if (!prNumber.match(/^[1-9][0-9]*$/)) {
        return `${eventName}-${headRef.replace(/\//g, "-")}`;
      }
      return `${eventName}-${prNumber}-${headRef.replace(/\//g, "-")}`;
    })();

    const run = await createWorkflowRun(onTestFinished, ghaContext, {
      octokit,
      owner,
      repo,
      sha,
      workflowId: "run-action-for-ci.yml",
      label,
    });

    const conclusion = await waitForWorkflowRunToComplete(
      octokit,
      owner,
      repo,
      run,
    );

    expect(conclusion).toBe("success");
  },
  E2E_TIMEOUT,
);
