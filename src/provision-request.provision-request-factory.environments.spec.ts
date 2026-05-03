import { expect, it, vi } from "vitest";
import { createTestAppRegistry } from "../test/app-registry.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../test/declaration.js";
import { createTestEnvironmentResolver } from "../test/environment-resolver.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../test/github-api.js";
import { createTestProvisionRequestTarget } from "../test/provision-request.js";
import { type RepoReference } from "./github-reference.js";
import {
  createProvisionRequestFactory,
  type ProvisionRequestTarget,
} from "./provision-request.js";
import { createTokenDeclarationRegistry } from "./token-declaration-registry.js";
import { normalizeTokenReference } from "./token-reference.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

it("supports self-repo environment targets", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createTestAppRegistry();
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
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a-1",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a-2",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-b",
    ),
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't match the same environment twice for self-repos", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createTestAppRegistry();
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
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-b",
    ),
  ] satisfies ProvisionRequestTarget[]);
});

it("supports pattern-matched repo environment targets", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoARef, "token-a", tokenDecA);

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");

  const appA = createTestApp(110, "app-a", "App A");
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    accountA,
    "selected",
  );

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

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
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a-1",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a-2",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-b",
    ),
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't match the same environment twice for pattern-matched repos", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoARef, "token-a", tokenDecA);

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");

  const appA = createTestApp(110, "app-a", "App A");
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    accountA,
    "selected",
  );

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

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
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-b",
    ),
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't enable an environment target for a repo unless all matching repo patterns include the environment", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoARef, "token-a", tokenDecA);

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");

  const appA = createTestApp(110, "app-a", "App A");
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    accountA,
    "selected",
  );

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

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
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-b",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-c",
    ),
  ] satisfies ProvisionRequestTarget[]);
});

it("combines self-repo environment targets with pattern-matched repo environment targets", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoBRef: RepoReference = { account: "account-a", repo: "repo-b" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

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
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    accountA,
    "selected",
  );

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA, repoB]]],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

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
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-b",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-c",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-b",
      "env-b",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-b",
      "env-c",
    ),
  ] satisfies ProvisionRequestTarget[]);
});
