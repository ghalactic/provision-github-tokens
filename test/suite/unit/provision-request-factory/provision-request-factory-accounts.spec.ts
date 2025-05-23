import { expect, it, vi } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../../src/app-registry.js";
import {
  type AccountReference,
  type RepoReference,
} from "../../../../src/github-reference.js";
import {
  createProvisionRequestFactory,
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
} from "../../../github-api.js";

vi.mock("@actions/core");

it("supports self-account targets", async () => {
  const accountA: AccountReference = { account: "account-a" };
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

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

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { account: { actions: true } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    { platform: "github", type: "actions", target: accountA },
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { account: { codespaces: true } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    { platform: "github", type: "codespaces", target: accountA },
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { account: { dependabot: true } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    { platform: "github", type: "dependabot", target: accountA },
  ] satisfies ProvisionRequestTarget[]);
});

it("supports pattern-matched account targets", async () => {
  const repoA: RepoReference = { account: "account-a-1", repo: "repo-a" };

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

  const accountA1 = createTestInstallationAccount(
    "Organization",
    100,
    "account-a-1",
  );
  const accountA2 = createTestInstallationAccount(
    "Organization",
    200,
    "account-a-2",
  );
  const accountB = createTestInstallationAccount(
    "Organization",
    300,
    "account-b",
  );

  const appA = createTestApp(110, "app-a", "App A");
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  appRegistry.registerApp(appRegA);

  const appAInstallationA1 = createTestInstallation(
    111,
    appA,
    accountA1,
    "selected",
  );
  const appAInstallationRegA1: InstallationRegistration = {
    installation: appAInstallationA1,
    repos: [],
  };
  appRegistry.registerInstallation(appAInstallationRegA1);

  const appAInstallationA2 = createTestInstallation(
    112,
    appA,
    accountA2,
    "selected",
  );
  const appAInstallationRegA2: InstallationRegistration = {
    installation: appAInstallationA2,
    repos: [],
  };
  appRegistry.registerInstallation(appAInstallationRegA2);

  const appAInstallationB = createTestInstallation(
    113,
    appA,
    accountB,
    "selected",
  );
  const appAInstallationRegB: InstallationRegistration = {
    installation: appAInstallationB,
    repos: [],
  };
  appRegistry.registerInstallation(appAInstallationRegB);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { accounts: { "account-a-*": { actions: true } } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    { platform: "github", type: "actions", target: { account: "account-a-1" } },
    { platform: "github", type: "actions", target: { account: "account-a-2" } },
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { accounts: { "account-a-*": { codespaces: true } } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-a-1" },
    },
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-a-2" },
    },
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { accounts: { "account-a-*": { dependabot: true } } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-a-1" },
    },
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-a-2" },
    },
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't match the same account twice", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

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

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const accountB = createTestInstallationAccount(
    "Organization",
    300,
    "account-b",
  );

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
    repos: [],
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
    repos: [],
  };
  appRegistry.registerInstallation(appAInstallationRegB);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: {
            accounts: {
              "*": { actions: true },
              "account-*": { actions: true },
            },
          },
        }),
      )
    )?.to,
  ).toStrictEqual([
    { platform: "github", type: "actions", target: { account: "account-a" } },
    { platform: "github", type: "actions", target: { account: "account-b" } },
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't enable a target for an account if any matching patterns disable the target", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

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

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const accountB = createTestInstallationAccount(
    "Organization",
    300,
    "account-b",
  );

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
    repos: [],
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
    repos: [],
  };
  appRegistry.registerInstallation(appAInstallationRegB);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: {
            accounts: {
              "account-b": { actions: false },
              "*": { actions: true, codespaces: false },
              "account-a": { codespaces: true },
            },
          },
        }),
      )
    )?.to,
  ).toStrictEqual([
    { platform: "github", type: "actions", target: { account: "account-a" } },
  ] satisfies ProvisionRequestTarget[]);
});

it("allows self-account targets to override pattern-matched account targets", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

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

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const accountB = createTestInstallationAccount(
    "Organization",
    300,
    "account-b",
  );

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
    repos: [],
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
    repos: [],
  };
  appRegistry.registerInstallation(appAInstallationRegB);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: {
            account: { codespaces: true },
            accounts: {
              "*": { actions: true, codespaces: false },
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
    { platform: "github", type: "actions", target: { account: "account-b" } },
  ] satisfies ProvisionRequestTarget[]);
});
