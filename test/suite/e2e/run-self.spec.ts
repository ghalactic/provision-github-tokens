import { expect, it } from "vitest";
import {
  createSelfRunWorkflow,
  E2E_TIMEOUT,
  waitForWorkflowRunToSucceed,
} from "../../e2e.js";
import { getGHAContext } from "../../gha.js";

const ghaContext = getGHAContext();

it(
  "can run itself via workflow_dispatch",
  async ({ onTestFinished }) => {
    const { headRef, refName } = ghaContext;
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

    const run = await createSelfRunWorkflow(onTestFinished, ghaContext, label);

    await expect(
      waitForWorkflowRunToSucceed(ghaContext, run),
    ).resolves.toBeUndefined();
  },
  E2E_TIMEOUT,
);
