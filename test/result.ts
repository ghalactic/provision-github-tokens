import { isWriteAccess, maxAccess } from "../src/access-level.js";
import type { PermissionsRule } from "../src/type/permissions-rule.js";
import type { Permissions } from "../src/type/permissions.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
  ProvisionAuthTargetRuleResult,
} from "../src/type/provision-auth-result.js";
import type { ProvisionSecretsRule } from "../src/type/provision-rule.js";
import type {
  TokenAuthResourceResultRuleResult,
  TokenAuthResourceResultWithVisibility,
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
  const type = result.type ?? "ALL_REPOS";
  const isAllowed = result.isAllowed ?? true;
  const request = result.request ?? defaultTokenRequest(type);
  const permissions: Permissions = request.tokenDec?.permissions ?? {
    metadata: "read",
  };
  const maxWant = result.maxWant ?? maxAccess(permissions);
  const isMissingRole =
    result.isMissingRole ?? (isWriteAccess(maxWant) && !request.tokenDec?.as);
  const isSufficient = result.isSufficient ?? isAllowed;

  if (type === "SELECTED_REPOS") {
    const selected = result as Partial<TokenAuthResultSelectedRepos>;
    const results = normalizeTokenResources(
      selected.results ?? {
        "account-a/repo-a": {
          rules: [],
          have: permissions,
          isSufficient,
          visibility: "private",
        },
      },
      permissions,
    );
    const resolvedSufficient = Object.values(results).every(
      (resource) => resource.isSufficient,
    );

    return {
      type: "SELECTED_REPOS",
      request,
      results,
      isSufficient: resolvedSufficient,
      isMissingRole,
      maxWant,
      isMatched: selected.isMatched ?? true,
      isAllowed: resolvedSufficient && !isMissingRole,
    };
  }

  const scoped = result as Partial<TokenAuthResultAllRepos>;
  const have = scoped.have ?? permissions;
  const rules =
    scoped.rules && scoped.rules.length > 0
      ? scoped.rules
      : isSufficient
        ? [createTestTokenAuthRuleResult(have)]
        : [];
  const resolvedAllowed = isSufficient && !isMissingRole;

  if (type === "NO_REPOS") {
    return {
      type: "NO_REPOS",
      request,
      rules,
      have,
      maxWant,
      isSufficient,
      isMissingRole,
      isAllowed: resolvedAllowed,
    };
  }

  return {
    type: "ALL_REPOS",
    request,
    rules,
    have,
    maxWant,
    isSufficient,
    isMissingRole,
    isAllowed: resolvedAllowed,
  };
}

export function createTestProvisionAuthTargetResult(
  result: Partial<ProvisionAuthTargetResult> = {},
): ProvisionAuthTargetResult {
  const {
    isAllowed = true,
    rules: rulesOverride,
    have: haveOverride,
    ...overrides
  } = result;

  const tokenAuthResult =
    overrides.tokenAuthResult ?? createTestTokenAuthResult();
  const isTokenAllowed = overrides.isTokenAllowed ?? tokenAuthResult.isAllowed;
  const isProvisionAllowed = overrides.isProvisionAllowed ?? isAllowed;
  const isSecretVisibilityCategoryAllowed =
    overrides.isSecretVisibilityCategoryAllowed ?? isProvisionAllowed;
  const rules =
    rulesOverride && rulesOverride.length > 0
      ? rulesOverride
      : isProvisionAllowed
        ? [createTestProvisionAuthTargetRuleResult()]
        : [];
  const have = haveOverride ?? rules.at(-1)?.have;

  return {
    target: {
      platform: "github",
      type: "actions",
      target: { account: "account-a" },
      visibility: "all",
    },
    rules,
    have,
    tokenAuthResult,
    isTokenAllowed,
    isSecretVisibilityCategoryAllowed,
    isProvisionAllowed,
    isAllowed: isTokenAllowed && isProvisionAllowed,
    ...overrides,
  } as ProvisionAuthTargetResult;
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

function defaultTokenRequest(
  type: TokenAuthResult["type"],
): TokenAuthResultAllRepos["request"] {
  if (type === "NO_REPOS") {
    return {
      consumer: { account: "account-a" },
      repos: [],
      tokenDec: createTestTokenDec({
        permissions: { metadata: "read" },
        repos: [],
      }),
    };
  }

  if (type === "SELECTED_REPOS") {
    return {
      consumer: { account: "account-a" },
      repos: ["repo-a"],
      tokenDec: createTestTokenDec({
        permissions: { metadata: "read" },
        repos: ["repo-a"],
      }),
    };
  }

  return {
    consumer: { account: "account-a" },
    repos: "all",
    tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
  };
}

function normalizeTokenResources(
  results: Record<string, TokenAuthResourceResultWithVisibility>,
  have: Permissions,
): Record<string, TokenAuthResourceResultWithVisibility> {
  const normalized: Record<string, TokenAuthResourceResultWithVisibility> = {};

  for (const [repo, resource] of Object.entries(results)) {
    normalized[repo] =
      resource.rules.length > 0 || !resource.isSufficient
        ? resource
        : {
            ...resource,
            rules: [createTestTokenAuthRuleResult(resource.have ?? have)],
          };
  }

  return normalized;
}

function createTestTokenAuthRuleResult(
  have: Permissions,
): TokenAuthResourceResultRuleResult {
  return {
    index: 0,
    rule: createTestPermissionsRule(have),
    have,
    isSufficient: true,
  };
}

function createTestPermissionsRule(permissions: Permissions): PermissionsRule {
  return {
    resources: [
      {
        accounts: ["*"],
        noRepos: true,
        allRepos: true,
        selectedRepos: { repos: ["*"], visibility: "private" },
      },
    ],
    consumers: ["*", "*/*"],
    permissions,
  };
}

function createTestProvisionAuthTargetRuleResult(): ProvisionAuthTargetRuleResult {
  return {
    index: 0,
    rule: createTestProvisionSecretsRule(),
    have: "allow",
  };
}

function createTestProvisionSecretsRule(): ProvisionSecretsRule {
  return {
    secrets: ["*"],
    requesters: ["*"],
    to: {
      github: {
        account: { types: {} },
        accounts: {},
        repo: { visibility: "private", types: { environments: {} } },
        repos: {},
      },
    },
  };
}
