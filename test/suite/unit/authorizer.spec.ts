import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../../../__mocks__/@actions/core.js";
import {
  __reset as __resetOctokit,
  __setApps,
  __setInstallations,
} from "../../../__mocks__/@octokit/action.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import {
  createAuthorizer,
  type AuthorizeResult,
} from "../../../src/authorizer.js";
import { createProvisionAuthorizer } from "../../../src/provision-authorizer.js";
import { createProvisionRequestFactory } from "../../../src/provision-request.js";
import { createTokenAuthorizer } from "../../../src/token-authorizer.js";
import { createTokenDeclarationRegistry } from "../../../src/token-declaration-registry.js";
import type { TokenDeclaration } from "../../../src/token-declaration.js";
import type { PermissionsRule } from "../../../src/type/permissions-rule.js";
import type { ProvisionSecretsRule } from "../../../src/type/provision-rule.js";
import type { SecretDeclaration } from "../../../src/type/secret-declaration.js";
import type { TokenAuthResult } from "../../../src/type/token-auth-result.js";
import { createTestEnvironmentResolver } from "../../environment-resolver.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";
import { createTestTokenRequestFactory } from "../../token-request.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("authorizes all requests and outputs the results", async () => {
  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A", {
    contents: "read",
    metadata: "read",
  });
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA = createTestInstallation(111, appA, accountA, "all");
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA],
  };

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA]]]);

  const declarationRegistry = createTokenDeclarationRegistry();

  const tokenDecA: TokenDeclaration = {
    shared: false,
    as: undefined,
    account: "account-a",
    repos: "all",
    permissions: { contents: "read" },
  };
  declarationRegistry.registerDeclaration(
    { account: "account-a", repo: "repo-a" },
    "tokenA",
    tokenDecA,
  );

  const tokenDecB: TokenDeclaration = {
    shared: false,
    as: undefined,
    account: "account-a",
    repos: "all",
    permissions: { metadata: "read" },
  };
  declarationRegistry.registerDeclaration(
    { account: "account-a", repo: "repo-a" },
    "tokenB",
    tokenDecB,
  );

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );
  const createTokenRequest = createTestTokenRequestFactory();

  const permissionsRuleA: PermissionsRule = {
    consumers: ["*", "*/*"],
    permissions: { contents: "read", metadata: "read" },
    resources: [
      {
        accounts: ["*"],
        allRepos: true,
        noRepos: true,
        selectedRepos: ["*"],
      },
    ],
  };
  const tokenAuthorizer = createTokenAuthorizer({ rules: [permissionsRuleA] });

  const secretsRuleA: ProvisionSecretsRule = {
    secrets: ["*"],
    requesters: ["*/*"],
    to: {
      github: {
        account: {},
        accounts: { "*": { actions: "allow" } },
        repo: { environments: {} },
        repos: { "*/*": { actions: "allow", environments: {} } },
      },
    },
  };
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    { rules: { secrets: [secretsRuleA] } },
  );

  const authorizer = createAuthorizer(
    createProvisionRequest,
    provisionAuthorizer,
    tokenAuthorizer,
  );

  const secretDecA: SecretDeclaration = {
    token: "account-a/repo-a.tokenA",
    github: {
      account: {},
      accounts: { "account-a": { actions: true } },
      repo: { environments: [] },
      repos: {},
    },
  };
  const secretDecB: SecretDeclaration = {
    token: "account-a/repo-a.tokenB",
    github: {
      account: {},
      accounts: {},
      repo: { environments: [] },
      repos: {
        "account-a/repo-a": { actions: true, environments: [] },
      },
    },
  };

  const result = await authorizer.authorize([
    {
      requester: { account: "account-a", repo: "repo-a" },
      config: {
        $schema: "",
        tokens: {},
        provision: {
          secrets: {
            SECRET_A: secretDecA,
            SECRET_B: secretDecB,
          },
        },
      },
    },
  ]);

  const expectedTokenResultA: TokenAuthResult = {
    type: "ALL_REPOS",
    have: { contents: "read", metadata: "read" },
    isAllowed: true,
    isMissingRole: false,
    isSufficient: true,
    maxWant: "read",
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: tokenDecA,
    },
    rules: [
      {
        have: { contents: "read", metadata: "read" },
        index: 0,
        isSufficient: true,
        rule: permissionsRuleA,
      },
    ],
  };
  const expectedTokenResultB: TokenAuthResult = {
    type: "ALL_REPOS",
    have: { contents: "read", metadata: "read" },
    isAllowed: true,
    isMissingRole: false,
    isSufficient: true,
    maxWant: "read",
    request: {
      consumer: { account: "account-a", repo: "repo-a" },
      repos: "all",
      tokenDec: tokenDecB,
    },
    rules: [
      {
        have: { contents: "read", metadata: "read" },
        index: 0,
        isSufficient: true,
        rule: permissionsRuleA,
      },
    ],
  };

  expect(result).toEqual({
    provisionResults: [
      {
        isAllowed: true,
        isMissingTargets: false,
        request: {
          name: "SECRET_A",
          requester: { account: "account-a", repo: "repo-a" },
          secretDec: secretDecA,
          to: [
            {
              platform: "github",
              type: "actions",
              target: { account: "account-a" },
            },
          ],
          tokenDec: tokenDecA,
          tokenDecIsRegistered: true,
        },
        results: [
          {
            target: {
              platform: "github",
              type: "actions",
              target: { account: "account-a" },
            },
            have: "allow",
            isAllowed: true,
            isProvisionAllowed: true,
            isTokenAllowed: true,
            rules: [{ have: "allow", index: 0, rule: secretsRuleA }],
            tokenAuthResult: expectedTokenResultA,
          },
        ],
      },
      {
        isAllowed: true,
        isMissingTargets: false,
        request: {
          name: "SECRET_B",
          requester: { account: "account-a", repo: "repo-a" },
          secretDec: secretDecB,
          to: [
            {
              platform: "github",
              type: "actions",
              target: { account: "account-a", repo: "repo-a" },
            },
          ],
          tokenDec: tokenDecB,
          tokenDecIsRegistered: true,
        },
        results: [
          {
            target: {
              platform: "github",
              type: "actions",
              target: { account: "account-a", repo: "repo-a" },
            },
            have: "allow",
            isAllowed: true,
            isProvisionAllowed: true,
            isTokenAllowed: true,
            rules: [{ have: "allow", index: 0, rule: secretsRuleA }],
            tokenAuthResult: expectedTokenResultB,
          },
        ],
      },
    ],
    tokenResults: [expectedTokenResultA, expectedTokenResultB],
  } satisfies AuthorizeResult);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1

    Secret #2:

    ✅ Repo account-a/repo-a was allowed to provision secret SECRET_B:
      ✅ Can use token declaration account-a/repo-a.tokenB
      ✅ Can provision token to GitHub Actions secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1

    Token #1:

    ✅ Account account-a was allowed access to a token:
      ✅ Read access to all repos in account-a requested without a role
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have read, wanted read

    Token #2:

    ✅ Repo account-a/repo-a was allowed access to a token:
      ✅ Read access to all repos in account-a requested without a role
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read

    "
  `);
});

it("handles empty token requests", async () => {
  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A", {
    contents: "read",
    metadata: "read",
  });
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA = createTestInstallation(111, appA, accountA, "all");
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA],
  };

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA]]]);

  const declarationRegistry = createTokenDeclarationRegistry();

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );
  const createTokenRequest = createTestTokenRequestFactory();

  const tokenAuthorizer = createTokenAuthorizer({ rules: [] });

  const secretsRuleA: ProvisionSecretsRule = {
    secrets: ["*"],
    requesters: ["*/*"],
    to: {
      github: {
        account: {},
        accounts: { "*": { actions: "allow" } },
        repo: { environments: {} },
        repos: { "*/*": { actions: "allow", environments: {} } },
      },
    },
  };
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    { rules: { secrets: [secretsRuleA] } },
  );

  const authorizer = createAuthorizer(
    createProvisionRequest,
    provisionAuthorizer,
    tokenAuthorizer,
  );

  const secretDecA: SecretDeclaration = {
    token: "account-a/repo-a.tokenA",
    github: {
      account: {},
      accounts: { "account-a": { actions: true } },
      repo: { environments: [] },
      repos: {},
    },
  };

  const result = await authorizer.authorize([
    {
      requester: { account: "account-a", repo: "repo-a" },
      config: {
        $schema: "",
        tokens: {},
        provision: {
          secrets: {
            SECRET_A: secretDecA,
          },
        },
      },
    },
  ]);

  expect(result).toEqual({
    provisionResults: [
      {
        isAllowed: false,
        isMissingTargets: false,
        request: {
          name: "SECRET_A",
          requester: { account: "account-a", repo: "repo-a" },
          secretDec: secretDecA,
          to: [
            {
              platform: "github",
              type: "actions",
              target: { account: "account-a" },
            },
          ],
          tokenDec: undefined,
          tokenDecIsRegistered: false,
        },
        results: [
          {
            target: {
              platform: "github",
              type: "actions",
              target: { account: "account-a" },
            },
            have: "allow",
            isAllowed: false,
            isProvisionAllowed: true,
            isTokenAllowed: false,
            rules: [{ have: "allow", index: 0, rule: secretsRuleA }],
            tokenAuthResult: undefined,
          },
        ],
      },
    ],
    tokenResults: [],
  } satisfies AuthorizeResult);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ❌ Can't use token declaration account-a/repo-a.tokenA because it doesn't exist
      ❌ Can't provision token to GitHub Actions secret in account-a:
        ❌ Token can't be authorized without a declaration
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1

    ::warning::❌ No tokens were authorized

    "
  `);
});

it("handles empty provision requests", async () => {
  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTokenAuthorizer({ rules: [] });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    { rules: { secrets: [] } },
  );
  const authorizer = createAuthorizer(
    createProvisionRequest,
    provisionAuthorizer,
    tokenAuthorizer,
  );

  const result = await authorizer.authorize([]);

  expect(result).toEqual({
    provisionResults: [],
    tokenResults: [],
  } satisfies AuthorizeResult);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    ::warning::❌ No secrets were authorized

    ::warning::❌ No tokens were authorized

    "
  `);
});
