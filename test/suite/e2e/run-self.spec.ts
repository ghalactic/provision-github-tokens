import { expect, it } from "vitest";
import {
  createSelfRunWorkflow,
  E2E_TIMEOUT,
  waitForWorkflowRunToSucceed,
} from "../../e2e.js";
import { getGHAContext, underGHA } from "../../gha.js";

underGHA(() => {
  const ghaContext = getGHAContext();

  it(
    "can run itself via workflow_dispatch",
    async ({ onTestFinished }) => {
      const run = await createSelfRunWorkflow(
        onTestFinished,
        ghaContext,
        "example-label",
      );

      await expect(
        waitForWorkflowRunToSucceed(ghaContext, run),
      ).resolves.toBeUndefined();
    },
    E2E_TIMEOUT,
  );
});
