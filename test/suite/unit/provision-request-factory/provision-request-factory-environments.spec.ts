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
import { createProvisionRequestFactory } from "../../../../src/provision-request.js";
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
  ]);

  // TODO: Test pattern overlap
});

// TODO: Test least-privilege of env patterns
it.todo("doesn't match the same environment twice for self-repos");

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
  ]);

  // TODO: Test pattern overlap
});

// TODO: Test least-privilege of env patterns
it.todo("doesn't match the same environment twice for pattern-matched repos");
