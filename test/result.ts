import type { ProvisionAuthTargetResult } from "../src/type/provision-auth-result.js";
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
