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

it("supports self-account targets", async () => {
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
          github: { account: { actions: true } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    createTestProvisionRequestTarget("actions"),
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
    createTestProvisionRequestTarget("codespaces"),
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
    createTestProvisionRequestTarget("dependabot"),
  ] satisfies ProvisionRequestTarget[]);
});

it("supports pattern-matched account targets", async () => {
  const repoA: RepoReference = { account: "account-a-1", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const [[accountA1], [accountA2], [accountB]] = createTestInstallationAccounts(
    ["Organization", 100, "account-a-1"],
    ["Organization", 200, "account-a-2"],
    ["Organization", 300, "account-b"],
  );

  const [[appA, [appAInstallationA1, appAInstallationA2, appAInstallationB]]] =
    createTestApps([
      "App A",
      {},
      [
        [accountA1, "selected"],
        [accountA2, "selected"],
        [accountB, "selected"],
      ],
    ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [
      [appAInstallationA1, []],
      [appAInstallationA2, []],
      [appAInstallationB, []],
    ],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

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
    createTestProvisionRequestTarget("actions", "account-a-1"),
    createTestProvisionRequestTarget("actions", "account-a-2"),
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
    createTestProvisionRequestTarget("codespaces", "account-a-1"),
    createTestProvisionRequestTarget("codespaces", "account-a-2"),
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
    createTestProvisionRequestTarget("dependabot", "account-a-1"),
    createTestProvisionRequestTarget("dependabot", "account-a-2"),
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't match the same account twice", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const [[accountA], [accountB]] = createTestInstallationAccounts(
    ["Organization", 100, "account-a"],
    ["Organization", 300, "account-b"],
  );

  const [[appA, [appAInstallationA, appAInstallationB]]] = createTestApps([
    "App A",
    {},
    [
      [accountA, "selected"],
      [accountB, "selected"],
    ],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [
      [appAInstallationA, []],
      [appAInstallationB, []],
    ],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

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
    createTestProvisionRequestTarget("actions"),
    createTestProvisionRequestTarget("actions", "account-b"),
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't enable a target for an account if any matching patterns disable the target", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const [[accountA], [accountB]] = createTestInstallationAccounts(
    ["Organization", 100, "account-a"],
    ["Organization", 300, "account-b"],
  );

  const [[appA, [appAInstallationA, appAInstallationB]]] = createTestApps([
    "App A",
    {},
    [
      [accountA, "selected"],
      [accountB, "selected"],
    ],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [
      [appAInstallationA, []],
      [appAInstallationB, []],
    ],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

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
    createTestProvisionRequestTarget("actions"),
  ] satisfies ProvisionRequestTarget[]);
});

it("allows self-account targets to override pattern-matched account targets", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const [[accountA], [accountB]] = createTestInstallationAccounts(
    ["Organization", 100, "account-a"],
    ["Organization", 300, "account-b"],
  );

  const [[appA, [appAInstallationA, appAInstallationB]]] = createTestApps([
    "App A",
    {},
    [
      [accountA, "selected"],
      [accountB, "selected"],
    ],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [
      [appAInstallationA, []],
      [appAInstallationB, []],
    ],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

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
    createTestProvisionRequestTarget("actions"),
    createTestProvisionRequestTarget("codespaces"),
    createTestProvisionRequestTarget("actions", "account-b"),
  ] satisfies ProvisionRequestTarget[]);
});
