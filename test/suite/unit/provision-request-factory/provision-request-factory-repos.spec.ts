import { expect, it, vi } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../../src/app-registry.js";
import { type RepoReference } from "../../../../src/github-reference.js";
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
  createTestInstallationRepo,
} from "../../../github-api.js";

vi.mock("@actions/core");

it("supports self-repo targets", async () => {
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
          github: { repo: { actions: true } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    { platform: "github", type: "actions", target: repoA },
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { repo: { codespaces: true } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    { platform: "github", type: "codespaces", target: repoA },
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { repo: { dependabot: true } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    { platform: "github", type: "dependabot", target: repoA },
  ] satisfies ProvisionRequestTarget[]);
});

it("supports pattern-matched repo targets", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoARef, "token-a", tokenDecA);

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA1 = createTestInstallationRepo(accountA, "repo-a-1");
  const repoA2 = createTestInstallationRepo(accountA, "repo-a-2");
  const repoB = createTestInstallationRepo(accountA, "repo-b");

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
    repos: [repoA1, repoA2, repoB],
  };
  appRegistry.registerInstallation(appAInstallationRegA);

  expect(
    (
      await createProvisionRequest(
        repoARef,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoARef, "token-a"),
          github: { repos: { "account-a/repo-a-*": { actions: true } } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-a-1" },
    },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-a-2" },
    },
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoARef,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoARef, "token-a"),
          github: { repos: { "account-a/repo-a-*": { codespaces: true } } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-a", repo: "repo-a-1" },
    },
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-a", repo: "repo-a-2" },
    },
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoARef,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoARef, "token-a"),
          github: { repos: { "account-a/repo-a-*": { dependabot: true } } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-a", repo: "repo-a-1" },
    },
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-a", repo: "repo-a-2" },
    },
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't match the same repo twice", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoARef, "token-a", tokenDecA);

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const repoB = createTestInstallationRepo(accountA, "repo-b");

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
    repos: [repoA, repoB],
  };
  appRegistry.registerInstallation(appAInstallationRegA);

  expect(
    (
      await createProvisionRequest(
        repoARef,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoARef, "token-a"),
          github: {
            repos: {
              "*/*": { actions: true },
              "account-*/repo-*": { actions: true },
            },
          },
        }),
      )
    )?.to,
  ).toStrictEqual([
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-b" },
    },
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't enable a target for a repo if any matching patterns disable the target", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoARef, "token-a", tokenDecA);

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const repoB = createTestInstallationRepo(accountA, "repo-b");

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
    repos: [repoA, repoB],
  };
  appRegistry.registerInstallation(appAInstallationRegA);

  expect(
    (
      await createProvisionRequest(
        repoARef,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoARef, "token-a"),
          github: {
            repos: {
              "*/repo-b": { actions: false },
              "*/*": { actions: true, codespaces: false },
              "*/repo-a": { codespaces: true },
            },
          },
        }),
      )
    )?.to,
  ).toStrictEqual([
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-a" },
    },
  ] satisfies ProvisionRequestTarget[]);
});

it("allows self-repo targets to override pattern-matched repo targets", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoARef, "token-a", tokenDecA);

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const repoB = createTestInstallationRepo(accountA, "repo-b");

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
    repos: [repoA, repoB],
  };
  appRegistry.registerInstallation(appAInstallationRegA);

  expect(
    (
      await createProvisionRequest(
        repoARef,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoARef, "token-a"),
          github: {
            repo: { codespaces: true },
            repos: {
              "*/*": { actions: true, codespaces: false },
            },
          },
        }),
      )
    )?.to,
  ).toStrictEqual([
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
      type: "actions",
      target: { account: "account-a", repo: "repo-b" },
    },
  ] satisfies ProvisionRequestTarget[]);
});
