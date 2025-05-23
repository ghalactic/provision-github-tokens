import { expect, it, vi } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../../src/app-registry.js";
import { type RepoReference } from "../../../../src/github-reference.js";
import {
  createProvisionRequestFactory,
  type ProvisionRequest,
  type ProvisionRequestTarget,
} from "../../../../src/provision-request.js";
import { createTokenDeclarationRegistry } from "../../../../src/token-declaration-registry.js";
import { normalizeTokenReference } from "../../../../src/token-reference.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../../../declaration.js";
import { createTestEnvironmentResolver } from "../../../environment-resolver.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../../github-api.js";

vi.mock("@actions/core");

it("creates provision requests from secret declarations", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoX: RepoReference = { account: "account-x", repo: "repo-x" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const secretDecA = createTestSecretDec({
    token: normalizeTokenReference(repoA, "token-a"),
  });

  expect(
    await createProvisionRequest(repoA, "SECRET_A", secretDecA),
  ).toStrictEqual({
    requester: repoA,
    name: "SECRET_A",
    secretDec: secretDecA,
    tokenDec: tokenDecA,
    tokenDecIsRegistered: true,
    to: [],
  } satisfies ProvisionRequest);
  expect(
    await createProvisionRequest(repoX, "SECRET_X", secretDecA),
  ).toStrictEqual({
    requester: repoX,
    name: "SECRET_X",
    secretDec: secretDecA,
    tokenDec: tokenDecA,
    tokenDecIsRegistered: true,
    to: [],
  } satisfies ProvisionRequest);
});

it("supports provisioning to multiple targets", async () => {
  const repoAARef: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoABRef: RepoReference = { account: "account-a", repo: "repo-b" };
  const repoBARef: RepoReference = { account: "account-b", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoAARef, "token-a", tokenDecA);

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoAA = createTestInstallationRepo(accountA, "repo-a");
  const repoAB = createTestInstallationRepo(accountA, "repo-b");

  const accountB = createTestInstallationAccount(
    "Organization",
    200,
    "account-b",
  );
  const repoBA = createTestInstallationRepo(accountB, "repo-a");

  const appA = createTestApp(110, "app-a", "App A");
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  appRegistry.registerApp(appRegA);

  const appAInstallationA = createTestInstallation(
    111,
    appA,
    accountA,
    "selected",
  );
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoAA, repoAB],
  };
  appRegistry.registerInstallation(appAInstallationRegA);

  const appAInstallationB = createTestInstallation(
    112,
    appA,
    accountB,
    "selected",
  );
  const appAInstallationRegB: InstallationRegistration = {
    installation: appAInstallationB,
    repos: [repoBA],
  };
  appRegistry.registerInstallation(appAInstallationRegB);

  environmentResolver.registerEnvironments(repoAARef, ["env-a", "env-b"]);
  environmentResolver.registerEnvironments(repoABRef, ["env-a"]);

  expect(
    (
      await createProvisionRequest(
        repoAARef,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoAARef, "token-a"),
          github: {
            account: {
              actions: true,
              codespaces: true,
              dependabot: true,
            },
            accounts: {
              "*": {
                actions: true,
                codespaces: true,
                dependabot: true,
              },
            },
            repo: {
              actions: true,
              codespaces: true,
              dependabot: true,
              environments: ["*"],
            },
            repos: {
              "*/*": {
                actions: true,
                codespaces: true,
                dependabot: true,
                environments: ["*"],
              },
            },
          },
        }),
      )
    )?.to,
  ).toStrictEqual([
    { platform: "github", type: "actions", target: { account: "account-a" } },
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-a" },
    },
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-a" },
    },
    { platform: "github", type: "actions", target: { account: "account-b" } },
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-b" },
    },
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-b" },
    },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-a", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-a", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-a" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-b" },
    },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-b" },
    },
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-a", repo: "repo-b" },
    },
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-a", repo: "repo-b" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-b", environment: "env-a" },
    },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-b", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-b", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-b", repo: "repo-a" },
    },
  ] satisfies ProvisionRequestTarget[]);
});

it("supports unshared token declarations", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoX: RepoReference = { account: "account-x", repo: "repo-x" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

  const tokenDecA = createTestTokenDec();
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const secretDecA = createTestSecretDec({
    token: normalizeTokenReference(repoA, "token-a"),
  });

  expect(
    await createProvisionRequest(repoX, "SECRET_X", secretDecA),
  ).toStrictEqual({
    requester: repoX,
    name: "SECRET_X",
    secretDec: secretDecA,
    tokenDec: undefined,
    tokenDecIsRegistered: true,
    to: [],
  } satisfies ProvisionRequest);
});

it("supports undefined token declarations", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoX: RepoReference = { account: "account-x", repo: "repo-x" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

  const secretDecA = createTestSecretDec({
    token: normalizeTokenReference(repoA, "token-a"),
  });

  expect(
    await createProvisionRequest(repoX, "SECRET_X", secretDecA),
  ).toStrictEqual({
    requester: repoX,
    name: "SECRET_X",
    secretDec: secretDecA,
    tokenDec: undefined,
    tokenDecIsRegistered: false,
    to: [],
  } satisfies ProvisionRequest);
});
