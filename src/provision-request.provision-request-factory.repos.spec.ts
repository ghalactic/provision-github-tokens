import { expect, it, vi } from "vitest";
import { createTestAppRegistry } from "../test/app-registry.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../test/declaration.js";
import { createTestEnvironmentResolver } from "../test/environment-resolver.js";
import {
  createTestApps,
  createTestInstallationAccounts,
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

it("supports self-repo targets", async () => {
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
    createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
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
    createTestProvisionRequestTarget("codespaces", "account-a", "repo-a"),
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
    createTestProvisionRequestTarget("dependabot", "account-a", "repo-a"),
  ] satisfies ProvisionRequestTarget[]);
});

it("supports pattern-matched repo targets", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoARef, "token-a", tokenDecA);

  const [[accountA, [repoA1, repoA2, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a-1", "repo-a-2", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA1, repoA2, repoB]]],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

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
    createTestProvisionRequestTarget("actions", "account-a", "repo-a-1"),
    createTestProvisionRequestTarget("actions", "account-a", "repo-a-2"),
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
    createTestProvisionRequestTarget("codespaces", "account-a", "repo-a-1"),
    createTestProvisionRequestTarget("codespaces", "account-a", "repo-a-2"),
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
    createTestProvisionRequestTarget("dependabot", "account-a", "repo-a-1"),
    createTestProvisionRequestTarget("dependabot", "account-a", "repo-a-2"),
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't match the same repo twice", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoARef, "token-a", tokenDecA);

  const [[accountA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

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
    createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
    createTestProvisionRequestTarget("actions", "account-a", "repo-b"),
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't enable a target for a repo if any matching patterns disable the target", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoARef, "token-a", tokenDecA);

  const [[accountA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

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
    createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
  ] satisfies ProvisionRequestTarget[]);
});

it("allows self-repo targets to override pattern-matched repo targets", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoARef, "token-a", tokenDecA);

  const [[accountA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

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
    createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
    createTestProvisionRequestTarget("codespaces", "account-a", "repo-a"),
    createTestProvisionRequestTarget("actions", "account-a", "repo-b"),
  ] satisfies ProvisionRequestTarget[]);
});
