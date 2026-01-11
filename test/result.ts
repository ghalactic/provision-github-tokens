import type { ProvisioningResult } from "../src/provisioner.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "../src/type/provision-auth-result.js";
import { createTestTokenDec } from "./declaration.js";

export function createTestProvisionAuthTargetResultAllowed(
  result: Partial<ProvisionAuthTargetResult> = {},
): ProvisionAuthTargetResult {
  return {
    target: {
      platform: "github",
      type: "actions",
      target: { account: "account-a" },
    },
    rules: [],
    have: "allow",
    tokenAuthResult: {
      type: "ALL_REPOS",
      have: { metadata: "read" },
      isAllowed: true,
      isMissingRole: false,
      isSufficient: true,
      maxWant: "read",
      request: {
        consumer: { account: "account-a" },
        repos: "all",
        tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
      },
      rules: [],
    },
    isTokenAllowed: true,
    isProvisionAllowed: true,
    isAllowed: true,
    ...result,
  };
}

export function createTestProvisionAuthTargetResultNotAllowed(
  result: Partial<ProvisionAuthTargetResult> = {},
): ProvisionAuthTargetResult {
  return {
    target: {
      platform: "github",
      type: "actions",
      target: { account: "account-a" },
    },
    rules: [],
    have: "deny",
    tokenAuthResult: {
      type: "ALL_REPOS",
      have: { metadata: "read" },
      isAllowed: true,
      isMissingRole: false,
      isSufficient: true,
      maxWant: "read",
      request: {
        consumer: { account: "account-a" },
        repos: "all",
        tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
      },
      rules: [],
    },
    isTokenAllowed: true,
    isProvisionAllowed: false,
    isAllowed: false,
    ...result,
  };
}

export function provisionResultsToArray(
  results: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): [ProvisionAuthResult, [ProvisionAuthTargetResult, ProvisioningResult][]][] {
  const array: [
    ProvisionAuthResult,
    [ProvisionAuthTargetResult, ProvisioningResult][],
  ][] = [];

  for (const [auth, targetResults] of results.entries()) {
    array.push([auth, Array.from(targetResults.entries())]);
  }

  return array;
}
