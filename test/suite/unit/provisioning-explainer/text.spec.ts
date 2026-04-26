import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../../../../__mocks__/@actions/core.js";
import type { ProvisionRequestTarget } from "../../../../src/provision-request.js";
import type { ProvisioningResult } from "../../../../src/provisioner.js";
import { createTextProvisioningExplainer } from "../../../../src/provisioning-explainer/text.js";
import type { ProvisionAuthResult } from "../../../../src/type/provision-auth-result.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../../../declaration.js";
import {
  createTestProvisionAuthTargetResultAllowed,
  createTestProvisionAuthTargetResultNotAllowed,
} from "../../../result.js";

vi.mock("@actions/core");

beforeEach(() => {
  __resetCore();
});

it("includes target context in failure summaries and debug blocks", () => {
  const targetA = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  } satisfies ProvisionRequestTarget;
  const targetB = {
    platform: "github",
    type: "codespaces",
    target: { account: "account-a", repo: "repo-a" },
  } satisfies ProvisionRequestTarget;
  const targetC = {
    platform: "github",
    type: "dependabot",
    target: { account: "account-a", repo: "repo-a" },
  } satisfies ProvisionRequestTarget;
  const targetD = {
    platform: "github",
    type: "environment",
    target: {
      account: "account-a",
      repo: "repo-a",
      environment: "env-a",
    },
  } satisfies ProvisionRequestTarget;

  const targetAResult = createTestProvisionAuthTargetResultAllowed({
    target: targetA,
  });
  const targetBResult = createTestProvisionAuthTargetResultNotAllowed({
    target: targetB,
  });
  const targetCResult = createTestProvisionAuthTargetResultNotAllowed({
    target: targetC,
  });
  const targetDResult = createTestProvisionAuthTargetResultAllowed({
    target: targetD,
  });

  const requestErrorBody = {
    message: "forbidden",
    nested: { reason: "missing scope" },
  };

  const authResult: ProvisionAuthResult = {
    isAllowed: false,
    isMissingTargets: false,
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_NAME",
      to: [targetD, targetB, targetA, targetC],
    },
    results: [targetDResult, targetBResult, targetAResult, targetCResult],
  };

  const targetResults = new Map([
    [
      targetDResult,
      { type: "ERROR", error: createError() } as ProvisioningResult,
    ],
    [
      targetCResult,
      {
        type: "REQUEST_ERROR",
        error: {
          status: 403,
          message: "Forbidden",
          response: { data: requestErrorBody },
        },
      } as ProvisioningResult,
    ],
    [targetAResult, { type: "PROVISIONED" } as ProvisioningResult],
    [targetBResult, { type: "NOT_ALLOWED" } as ProvisioningResult],
  ]);

  const explain = createTextProvisioningExplainer();

  expect(explain(authResult, targetResults)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x didn't fully provision secret SECRET_NAME:
      ✅ Provisioned to GitHub Actions secret in account-a
      ❌ Not allowed to GitHub Codespaces secret in account-a/repo-a
      ❌ Failed to provision to Dependabot secret in account-a/repo-a: 403: Forbidden
      ❌ Failed to provision to GitHub environment env-a secret in account-a/repo-a: boom"
  `);

  const output = __getOutput();

  expect(output).toContain("::debug::Dependabot secret in account-a/repo-a:");
  expect(output).toContain("::debug::    {");
  expect(output).toContain('::debug::      "message": "forbidden",');
  expect(output).toContain('::debug::        "reason": "missing scope"');
  expect(output).toContain(
    "::debug::GitHub environment env-a secret in account-a/repo-a:",
  );
  expect(output).toContain("::debug::    Error: boom");
  expect(output).toContain("::debug::        at target-a.ts:1:1");
});

it("falls back when debug body serialization fails", () => {
  const target = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  } satisfies ProvisionRequestTarget;

  const targetResult = createTestProvisionAuthTargetResultNotAllowed({
    target,
  });
  const body: Record<string, unknown> = { message: "circular" };
  body.self = body;

  const authResult: ProvisionAuthResult = {
    isAllowed: false,
    isMissingTargets: false,
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_NAME",
      to: [target],
    },
    results: [targetResult],
  };

  const targetResults = new Map([
    [
      targetResult,
      {
        type: "REQUEST_ERROR",
        error: {
          status: 500,
          message: "Internal Server Error",
          response: { data: body },
        },
      } as ProvisioningResult,
    ],
  ]);

  const explain = createTextProvisioningExplainer();

  expect(() => explain(authResult, targetResults)).not.toThrow();
  expect(__getOutput()).toContain("::debug::    [object Object]");
});

function createError(): Error {
  const error = new Error("boom");
  error.stack = "Error: boom\n    at target-a.ts:1:1";

  return error;
}
