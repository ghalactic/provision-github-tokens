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
import { createTestAccountProvisionRequestTarget } from "../test/provision-request.js";
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

it("supports self-account targets", async () => {
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
          github: { account: { actions: "all" } },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("actions", "account-a", "all"),
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { account: { agents: "all" } },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("agents", "account-a", "all"),
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { account: { codespaces: "all" } },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("codespaces", "account-a", "all"),
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { account: { dependabot: "all" } },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("dependabot", "account-a", "all"),
  ] satisfies ProvisionRequestTarget[]);
});

it("supports pattern-matched account targets", async () => {
  const repoA: RepoReference = { account: "account-a-1", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const [[accountA1, reposA1], [accountA2], [accountB]] =
    createTestInstallationAccounts(
      ["Organization", 100, "account-a-1", ["repo-a"]],
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

  const repoRegistry = createTestRepoRegistry();
  const appRegistry = createTestAppRegistry(repoRegistry, {
    app: appA,
    provisioner: true,
    installations: [
      [appAInstallationA1, reposA1],
      [appAInstallationA2, []],
      [appAInstallationB, []],
    ],
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
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { accounts: { "account-a-*": { actions: "all" } } },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("actions", "account-a-1", "all"),
    createTestAccountProvisionRequestTarget("actions", "account-a-2", "all"),
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { accounts: { "account-a-*": { agents: "all" } } },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("agents", "account-a-1", "all"),
    createTestAccountProvisionRequestTarget("agents", "account-a-2", "all"),
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { accounts: { "account-a-*": { codespaces: "all" } } },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("codespaces", "account-a-1", "all"),
    createTestAccountProvisionRequestTarget("codespaces", "account-a-2", "all"),
  ] satisfies ProvisionRequestTarget[]);

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { accounts: { "account-a-*": { dependabot: "all" } } },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("dependabot", "account-a-1", "all"),
    createTestAccountProvisionRequestTarget("dependabot", "account-a-2", "all"),
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't match the same account twice", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const [[accountA, reposA], [accountB]] = createTestInstallationAccounts(
    ["Organization", 100, "account-a", ["repo-a"]],
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

  const repoRegistry = createTestRepoRegistry();
  const appRegistry = createTestAppRegistry(repoRegistry, {
    app: appA,
    provisioner: true,
    installations: [
      [appAInstallationA, reposA],
      [appAInstallationB, []],
    ],
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
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: {
            accounts: {
              "*": { actions: "all" },
              "account-*": { actions: "all" },
            },
          },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("actions", "account-a", "all"),
    createTestAccountProvisionRequestTarget("actions", "account-b", "all"),
  ] satisfies ProvisionRequestTarget[]);
});

it("doesn't enable a target for an account if any matching patterns disable the target", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const [[accountA, reposA], [accountB]] = createTestInstallationAccounts(
    ["Organization", 100, "account-a", ["repo-a"]],
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

  const repoRegistry = createTestRepoRegistry();
  const appRegistry = createTestAppRegistry(repoRegistry, {
    app: appA,
    provisioner: true,
    installations: [
      [appAInstallationA, reposA],
      [appAInstallationB, []],
    ],
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
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: {
            accounts: {
              "account-b": { actions: false },
              "*": { actions: "all", codespaces: false },
              "account-a": { codespaces: "all" },
            },
          },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("actions", "account-a", "all"),
  ] satisfies ProvisionRequestTarget[]);
});

it("allows self-account targets to override pattern-matched account targets", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const [[accountA, reposA], [accountB]] = createTestInstallationAccounts(
    ["Organization", 100, "account-a", ["repo-a"]],
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

  const repoRegistry = createTestRepoRegistry();
  const appRegistry = createTestAppRegistry(repoRegistry, {
    app: appA,
    provisioner: true,
    installations: [
      [appAInstallationA, reposA],
      [appAInstallationB, []],
    ],
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
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: {
            account: { actions: "private", codespaces: "private" },
            accounts: {
              "*": { actions: "all", codespaces: false },
            },
          },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("actions", "account-a", "private"),
    createTestAccountProvisionRequestTarget(
      "codespaces",
      "account-a",
      "private",
    ),
    createTestAccountProvisionRequestTarget("actions", "account-b", "all"),
  ] satisfies ProvisionRequestTarget[]);
});

it("keeps a target enabled when a matching pattern omits it", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const [[accountA, reposA], [accountB]] = createTestInstallationAccounts(
    ["Organization", 100, "account-a", ["repo-a"]],
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

  const repoRegistry = createTestRepoRegistry();
  const appRegistry = createTestAppRegistry(repoRegistry, {
    app: appA,
    provisioner: true,
    installations: [
      [appAInstallationA, reposA],
      [appAInstallationB, []],
    ],
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
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: {
            accounts: {
              "account-b": {},
              "*": { actions: "all" },
              "account-a": { codespaces: "all" },
            },
          },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("actions", "account-b", "all"),
    createTestAccountProvisionRequestTarget("actions", "account-a", "all"),
    createTestAccountProvisionRequestTarget("codespaces", "account-a", "all"),
  ] satisfies ProvisionRequestTarget[]);
});

it("supports selected-repo account targets", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoB: RepoReference = { account: "account-a", repo: "repo-b" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const [[accountA, reposA]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a", "repo-b", "other"],
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
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { account: { actions: ["repo-*"] } },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("actions", "account-a", {
      patterns: ["repo-*"],
      repos: [
        { ref: repoA, id: 2536791224 },
        { ref: repoB, id: 772360969 },
      ],
    }),
  ] satisfies ProvisionRequestTarget[]);
});

it("supports an explicitly empty selected-repo account target", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

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

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    repoRegistry,
    environmentResolver,
  );

  expect(
    (
      await createProvisionRequest(
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { account: { actions: [] } },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("actions", "account-a", {
      patterns: [],
      repos: [],
    }),
  ] satisfies ProvisionRequestTarget[]);
});

it("distinguishes a selected-repo account target whose patterns match nothing", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const [[accountA, reposA]] = createTestInstallationAccounts([
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
        repoA,
        "SECRET_A",
        createTestSecretDec({
          token: normalizeTokenReference(repoA, "token-a"),
          github: { account: { actions: ["team-*"] } },
        }),
      )
    ).to,
  ).toStrictEqual([
    createTestAccountProvisionRequestTarget("actions", "account-a", {
      patterns: ["team-*"],
      repos: [],
    }),
  ] satisfies ProvisionRequestTarget[]);
});
