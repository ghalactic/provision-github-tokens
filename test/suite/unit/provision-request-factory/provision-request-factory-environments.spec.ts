import { expect, it, vi } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../../src/app-registry.js";
import {
  createEnvRef,
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
  createTestInstallationRepo,
} from "../../../github-api.js";

vi.mock("@actions/core");

it("supports self-repo environment targets", async () => {
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

  environmentResolver.registerEnvironments(repoA, [
    "env-a-1",
    "env-a-2",
    "env-b",
    "env-c",
  ]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { repo: { environments: ["env-a-*", "env-b"] } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    {
      platform: "github",
      type: "environment",
      target: createEnvRef("account-a", "repo-a", "env-a-1"),
    },
    {
      platform: "github",
      type: "environment",
      target: createEnvRef("account-a", "repo-a", "env-a-2"),
    },
    {
      platform: "github",
      type: "environment",
      target: createEnvRef("account-a", "repo-a", "env-b"),
    },
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't match the same environment twice for self-repos", async () => {
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

  environmentResolver.registerEnvironments(repoA, ["env-a", "env-b"]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { repo: { environments: ["*", "env-*"] } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    {
      platform: "github",
      type: "environment",
      target: createEnvRef("account-a", "repo-a", "env-a"),
    },
    {
      platform: "github",
      type: "environment",
      target: createEnvRef("account-a", "repo-a", "env-b"),
    },
  ] satisfies ProvisionRequestTarget[]);
});

it("supports pattern-matched repo environment targets", async () => {
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
    repos: [repoA],
  };
  appRegistry.registerInstallation(appAInstallationRegA);

  environmentResolver.registerEnvironments(repoARef, [
    "env-a-1",
    "env-a-2",
    "env-b",
    "env-c",
  ]);

  expect(
    (
      await createProvisionRequest(
        repoARef,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoARef, "token-a"),
          github: {
            repos: {
              "account-a/repo-a": { environments: ["env-a-*", "env-b"] },
            },
          },
        }),
      )
    )?.to,
  ).toStrictEqual([
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-a-1" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-a-2" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-b" },
    },
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't match the same environment twice for pattern-matched repos", async () => {
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
    repos: [repoA],
  };
  appRegistry.registerInstallation(appAInstallationRegA);

  environmentResolver.registerEnvironments(repoARef, ["env-a", "env-b"]);

  expect(
    (
      await createProvisionRequest(
        repoARef,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoARef, "token-a"),
          github: {
            repos: {
              "*/*": { environments: ["*", "env-*"] },
              "account-*/repo-*": { environments: ["*", "env-*"] },
            },
          },
        }),
      )
    )?.to,
  ).toStrictEqual([
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
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't enable an environment target for a repo unless all matching repo patterns include the environment", async () => {
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
    repos: [repoA],
  };
  appRegistry.registerInstallation(appAInstallationRegA);

  environmentResolver.registerEnvironments(repoARef, [
    "env-a",
    "env-b",
    "env-c",
    "env-d",
  ]);

  expect(
    (
      await createProvisionRequest(
        repoARef,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoARef, "token-a"),
          github: {
            repos: {
              "*/*": { environments: ["env-a", "env-b", "env-c"] },
              "account-*/repo-*": { environments: ["env-b", "env-c", "env-d"] },
            },
          },
        }),
      )
    )?.to,
  ).toStrictEqual([
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-b" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-c" },
    },
  ] satisfies ProvisionRequestTarget[]);
});

it("combines self-repo environment targets with pattern-matched repo environment targets", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoBRef: RepoReference = { account: "account-a", repo: "repo-b" };

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

  environmentResolver.registerEnvironments(repoARef, [
    "env-a",
    "env-b",
    "env-c",
  ]);
  environmentResolver.registerEnvironments(repoBRef, [
    "env-a",
    "env-b",
    "env-c",
  ]);

  expect(
    (
      await createProvisionRequest(
        repoARef,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoARef, "token-a"),
          github: {
            repo: { environments: ["env-a", "env-b"] },
            repos: {
              "*/*": { environments: ["env-b", "env-c"] },
            },
          },
        }),
      )
    )?.to,
  ).toStrictEqual([
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-b" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-c" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-a" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-b", environment: "env-b" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-b", environment: "env-c" },
    },
  ] satisfies ProvisionRequestTarget[]);
});
