import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "../src/type/provision-auth-result.js";
import type { TokenAuthResultAllRepos } from "../src/type/token-auth-result.js";
import { createTestSecretDec, createTestTokenDec } from "./declaration.js";

export function createTestTokenAuthResultAllowed(
  result: Partial<TokenAuthResultAllRepos> = {},
): TokenAuthResultAllRepos {
  return {
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
    ...result,
  };
}

export function createTestTokenAuthResultNotAllowed(
  result: Partial<TokenAuthResultAllRepos> = {},
): TokenAuthResultAllRepos {
  return {
    type: "ALL_REPOS",
    have: {},
    isAllowed: false,
    isMissingRole: false,
    isSufficient: false,
    maxWant: "read",
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    rules: [],
    ...result,
  };
}

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
    tokenAuthResult: createTestTokenAuthResultAllowed(),
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
    tokenAuthResult: createTestTokenAuthResultAllowed(),
    isTokenAllowed: true,
    isProvisionAllowed: false,
    isAllowed: false,
    ...result,
  };
}

export function createTestProvisionAuthResultAllowed(
  result: Partial<ProvisionAuthResult> = {},
): ProvisionAuthResult {
  const results = result.results ?? [
    createTestProvisionAuthTargetResultAllowed(),
  ];

  return {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        github: { accounts: { "account-a": { actions: true } } },
      }),
      name: "SECRET_A",
      to: results.map((targetResult) => targetResult.target),
    },
    results,
    isMissingTargets: false,
    isAllowed: true,
    ...result,
  };
}

export function createTestProvisionAuthResultNotAllowed(
  result: Partial<ProvisionAuthResult> = {},
): ProvisionAuthResult {
  const results = result.results ?? [
    createTestProvisionAuthTargetResultNotAllowed(),
  ];

  return {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        github: { accounts: { "account-a": { actions: true } } },
      }),
      name: "SECRET_A",
      to: results.map((targetResult) => targetResult.target),
    },
    results,
    isMissingTargets: false,
    isAllowed: false,
    ...result,
  };
}
