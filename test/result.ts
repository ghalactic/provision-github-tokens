import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "../src/type/provision-auth-result.js";
import type {
  TokenAuthResult,
  TokenAuthResultAllRepos,
  TokenAuthResultNoRepos,
  TokenAuthResultSelectedRepos,
} from "../src/type/token-auth-result.js";
import { createTestSecretDec, createTestTokenDec } from "./declaration.js";

export function createTestTokenAuthResult(): TokenAuthResultAllRepos;
export function createTestTokenAuthResult(
  result: Partial<TokenAuthResultAllRepos> & { type: "ALL_REPOS" },
): TokenAuthResultAllRepos;
export function createTestTokenAuthResult(
  result: Partial<TokenAuthResultNoRepos> & { type: "NO_REPOS" },
): TokenAuthResultNoRepos;
export function createTestTokenAuthResult(
  result: Partial<TokenAuthResultSelectedRepos> & { type: "SELECTED_REPOS" },
): TokenAuthResultSelectedRepos;
export function createTestTokenAuthResult(
  result: Partial<TokenAuthResult>,
): TokenAuthResult;
export function createTestTokenAuthResult(
  result: Partial<TokenAuthResult> = { type: "ALL_REPOS" },
): TokenAuthResult {
  const { type = "ALL_REPOS", isAllowed = true, ...overrides } = result;

  if (type === "SELECTED_REPOS") {
    return {
      type: "SELECTED_REPOS",
      ...(isAllowed
        ? { isAllowed: true, isSufficient: true }
        : { isAllowed: false, isSufficient: false }),
      isMissingRole: false,
      maxWant: "read",
      request: {
        consumer: { account: "account-a" },
        repos: "all",
        tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
      },
      results: {
        "repo-a": { rules: [], have: { metadata: "read" }, isSufficient: true },
      },
      isMatched: true,
      ...overrides,
    };
  }

  if (type === "NO_REPOS") {
    return {
      type: "NO_REPOS",
      have: { metadata: "read" },
      ...(isAllowed
        ? { isAllowed: true, isSufficient: true }
        : { isAllowed: false, isSufficient: false }),
      isMissingRole: false,
      maxWant: "read",
      request: {
        consumer: { account: "account-a" },
        repos: "all",
        tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
      },
      rules: [],
      ...overrides,
    };
  }

  return {
    type: "ALL_REPOS",
    have: { metadata: "read" },
    ...(isAllowed
      ? { isAllowed: true, isSufficient: true }
      : { isAllowed: false, isSufficient: false }),
    isMissingRole: false,
    maxWant: "read",
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    rules: [],
    ...overrides,
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
    tokenAuthResult: createTestTokenAuthResult(),
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
    tokenAuthResult: createTestTokenAuthResult(),
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
