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
        repos: ["repo-a"],
        tokenDec: createTestTokenDec({
          permissions: { metadata: "read" },
          repos: ["repo-a"],
        }),
      },
      results: {
        "account-a/repo-a": {
          rules: [],
          have: { metadata: "read" },
          isSufficient: isAllowed,
        },
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
        repos: [],
        tokenDec: createTestTokenDec({
          permissions: { metadata: "read" },
          repos: [],
        }),
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

export function createTestProvisionAuthTargetResult(
  result: Partial<ProvisionAuthTargetResult> = {},
): ProvisionAuthTargetResult {
  const { isAllowed = true, ...overrides } = result;

  const tokenAuthResult =
    overrides.tokenAuthResult ?? createTestTokenAuthResult();
  const isTokenAllowed = overrides.isTokenAllowed ?? tokenAuthResult.isAllowed;
  const isProvisionAllowed = overrides.isProvisionAllowed ?? isAllowed;

  return {
    target: {
      platform: "github",
      type: "actions",
      target: { account: "account-a" },
    },
    rules: [],
    have: isProvisionAllowed ? "allow" : "deny",
    tokenAuthResult,
    isTokenAllowed,
    isProvisionAllowed,
    isAllowed: isTokenAllowed && isProvisionAllowed,
    ...overrides,
  };
}

export function createTestProvisionAuthResult(
  result: Partial<ProvisionAuthResult> = {},
): ProvisionAuthResult {
  const { isAllowed = true, ...overrides } = result;

  const results = overrides.results ?? [
    createTestProvisionAuthTargetResult({ isAllowed }),
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
    isAllowed,
    ...overrides,
  };
}
