import { expect, it } from "vitest";
import {
  createSelfRunWorkflow,
  E2E_TIMEOUT,
  waitForWorkflowRunToComplete,
} from "../../e2e.js";
import { underGHA } from "../../gha.js";

underGHA((ghaContext) => {
  it(
    "can run itself via workflow_dispatch",
    async ({ onTestFinished }) => {
      const run = await createSelfRunWorkflow(
        onTestFinished,
        ghaContext,
        "example-label",
      );
      await waitForWorkflowRunToComplete(ghaContext, run);

      expect(run.conclusion).toBe("success");
    },
    E2E_TIMEOUT,
  );
});
