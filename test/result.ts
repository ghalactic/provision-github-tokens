import { maxAccess } from "../src/access-level.js";
import {
  isRepoProvisionRequestTarget,
  type ProvisionRequestTarget,
} from "../src/provision-request.js";
import type { Permissions } from "../src/type/permissions.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthSelectedReposResult,
  ProvisionAuthTargetResult,
} from "../src/type/provision-auth-result.js";
import type {
  TokenAuthResult,
  TokenAuthResultAllRepos,
  TokenAuthResultNoRepos,
  TokenAuthResultSelectedRepos,
} from "../src/type/token-auth-result.js";
import { createTestSecretDec, createTestTokenDec } from "./declaration.js";
import { createTestAccountProvisionRequestTarget } from "./provision-request.js";

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

  const permissions: Permissions = overrides.request?.tokenDec?.permissions ?? {
    metadata: "read",
  };
  const derivedMaxWant = maxAccess(permissions);
  const derivedHave = permissions;

  if (type === "SELECTED_REPOS") {
    return {
      type: "SELECTED_REPOS",
      ...(isAllowed
        ? { isAllowed: true, isSufficient: true }
        : { isAllowed: false, isSufficient: false }),
      isMissingRole: false,
      maxWant: derivedMaxWant,
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
          have: derivedHave,
          isSufficient: isAllowed,
          visibility: "private",
        },
      },
      isMatched: true,
      ...overrides,
    };
  }

  if (type === "NO_REPOS") {
    return {
      type: "NO_REPOS",
      have: derivedHave,
      ...(isAllowed
        ? { isAllowed: true, isSufficient: true }
        : { isAllowed: false, isSufficient: false }),
      isMissingRole: false,
      maxWant: derivedMaxWant,
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
    have: derivedHave,
    ...(isAllowed
      ? { isAllowed: true, isSufficient: true }
      : { isAllowed: false, isSufficient: false }),
    isMissingRole: false,
    maxWant: derivedMaxWant,
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    rules: [],
    ...overrides,
  };
}

export type TestProvisionAuthTargetResultOptions = Partial<
  Omit<ProvisionAuthTargetResult, "target">
> & {
  target?: ProvisionRequestTarget;
  selectedRepos?: ProvisionAuthSelectedReposResult;
};

export function createTestProvisionAuthTargetResult(
  result: TestProvisionAuthTargetResultOptions = {},
): ProvisionAuthTargetResult {
  const {
    isAllowed = true,
    tokenAuthResult = createTestTokenAuthResult(),
    isTokenAllowed = tokenAuthResult.isAllowed,
    isProvisionAllowed = isAllowed,
    have = isProvisionAllowed ? "allow" : "deny",
    rules = [],
    target = createTestAccountProvisionRequestTarget(
      "actions",
      "account-a",
      "all",
    ),
    selectedRepos,
  } = result;

  const common = {
    rules,
    have,
    tokenAuthResult,
    isTokenAllowed,
    isProvisionAllowed,
    isAllowed: isTokenAllowed && isProvisionAllowed,
  };

  if (isRepoProvisionRequestTarget(target)) {
    return { ...common, target };
  }

  return { ...common, target, selectedRepos };
}

export function createTestProvisionAuthResult(
  result: Partial<ProvisionAuthResult> = {},
): ProvisionAuthResult {
  const { isAllowed = true, ...overrides } = result;

  const results = overrides.results ?? [
    createTestProvisionAuthTargetResult({ isAllowed }),
  ];

  const isMissingTargets = overrides.isMissingTargets ?? false;
  const derivedIsAllowed =
    !isMissingTargets && results.every((r) => r.isAllowed);

  return {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        github: { accounts: { "account-a": { actions: "all" } } },
      }),
      name: "SECRET_A",
      to: results.map((targetResult) => targetResult.target),
    },
    results,
    isMissingTargets,
    isAllowed: derivedIsAllowed,
    ...overrides,
  };
}
