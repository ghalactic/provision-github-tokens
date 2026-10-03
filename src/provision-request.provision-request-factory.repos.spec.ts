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
import { createTestRepoProvisionRequestTarget } from "../test/provision-request.js";
import { createTestRepoRegistry } from "../test/repo-registry.js";
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

  const [[accountA, reposA]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const repoRegistry = createTestRepoRegistry();
  const appRegistry = createTestAppRegistry(repoRegistry, {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, reposA]],
  });
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    repoRegistry,
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
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a",
      "private",
    ),
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { repo: { agents: true } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    createTestRepoProvisionRequestTarget(
      "agents",
      "account-a",
      "repo-a",
      "private",
    ),
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
    createTestRepoProvisionRequestTarget(
      "codespaces",
      "account-a",
      "repo-a",
      "private",
    ),
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
    createTestRepoProvisionRequestTarget(
      "dependabot",
      "account-a",
      "repo-a",
      "private",
    ),
  ] satisfies ProvisionRequestTarget[]);
});

it("supports pattern-matched repo targets", async () => {
  const repoARef: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoARef, "token-a", tokenDecA);

  const [[accountA, reposA]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a", "repo-a-1", "repo-a-2", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

  const repoRegistry = createTestRepoRegistry();
  const appRegistry = createTestAppRegistry(repoRegistry, {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, reposA]],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    repoRegistry,
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
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a-1",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a-2",
      "private",
    ),
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoARef,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoARef, "token-a"),
          github: { repos: { "account-a/repo-a-*": { agents: true } } },
        }),
      )
    )?.to,
  ).toStrictEqual([
    createTestRepoProvisionRequestTarget(
      "agents",
      "account-a",
      "repo-a-1",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "agents",
      "account-a",
      "repo-a-2",
      "private",
    ),
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
    createTestRepoProvisionRequestTarget(
      "codespaces",
      "account-a",
      "repo-a-1",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "codespaces",
      "account-a",
      "repo-a-2",
      "private",
    ),
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
    createTestRepoProvisionRequestTarget(
      "dependabot",
      "account-a",
      "repo-a-1",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "dependabot",
      "account-a",
      "repo-a-2",
      "private",
    ),
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

  const repoRegistry = createTestRepoRegistry();
  const appRegistry = createTestAppRegistry(repoRegistry, {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA, repoB]]],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    repoRegistry,
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
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-b",
      "private",
    ),
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

  const repoRegistry = createTestRepoRegistry();
  const appRegistry = createTestAppRegistry(repoRegistry, {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA, repoB]]],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    repoRegistry,
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
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a",
      "private",
    ),
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

  const repoRegistry = createTestRepoRegistry();
  const appRegistry = createTestAppRegistry(repoRegistry, {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA, repoB]]],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    repoRegistry,
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
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "codespaces",
      "account-a",
      "repo-a",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-b",
      "private",
    ),
  ] satisfies ProvisionRequestTarget[]);
});
