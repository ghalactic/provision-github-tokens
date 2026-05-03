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
import {
  createTestProvisionRequest,
  createTestProvisionRequestTarget,
} from "../test/provision-request.js";
import { type RepoReference } from "./github-reference.js";
import {
  createProvisionRequestFactory,
  type ProvisionRequestTarget,
} from "./provision-request.js";
import { createTokenDeclarationRegistry } from "./token-declaration-registry.js";
import { normalizeTokenReference } from "./token-reference.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

it("creates provision requests from secret declarations", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoX: RepoReference = { account: "account-x", repo: "repo-x" };

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

  const secretDecA = createTestSecretDec({
    token: normalizeTokenReference(repoA, "token-a"),
  });

  expect(
    await createProvisionRequest(repoA, "SECRET_A", secretDecA),
  ).toStrictEqual(
    createTestProvisionRequest({
      tokenDec: tokenDecA,
      secretDec: secretDecA,
      to: [],
    }),
  );
  expect(
    await createProvisionRequest(repoX, "SECRET_X", secretDecA),
  ).toStrictEqual(
    createTestProvisionRequest({
      requester: repoX,
      name: "SECRET_X",
      tokenDec: tokenDecA,
      secretDec: secretDecA,
      to: [],
    }),
  );
});

it("supports provisioning to multiple targets", async () => {
  const repoAARef: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoABRef: RepoReference = { account: "account-a", repo: "repo-b" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createTestEnvironmentResolver();

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoAARef, "token-a", tokenDecA);

  const [[accountA, [repoAA, repoAB]], [accountB, [repoBA]]] =
    createTestInstallationAccounts(
      ["Organization", 100, "account-a", ["repo-a", "repo-b"]],
      ["Organization", 200, "account-b", ["repo-a"]],
    );
  const [[appA, [appAInstallationA, appAInstallationB]]] = createTestApps([
    110,
    "app-a",
    "App A",
    {},
    [
      [111, accountA, "selected"],
      [112, accountB, "selected"],
    ],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [
      [appAInstallationA, [repoAA, repoAB]],
      [appAInstallationB, [repoBA]],
    ],
  });

  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

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
    createTestProvisionRequestTarget("actions"),
    createTestProvisionRequestTarget("codespaces"),
    createTestProvisionRequestTarget("dependabot"),
    createTestProvisionRequestTarget("actions", "account-b"),
    createTestProvisionRequestTarget("codespaces", "account-b"),
    createTestProvisionRequestTarget("dependabot", "account-b"),
    createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
    createTestProvisionRequestTarget("codespaces", "account-a", "repo-a"),
    createTestProvisionRequestTarget("dependabot", "account-a", "repo-a"),
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
    createTestProvisionRequestTarget("actions", "account-a", "repo-b"),
    createTestProvisionRequestTarget("codespaces", "account-a", "repo-b"),
    createTestProvisionRequestTarget("dependabot", "account-a", "repo-b"),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-b",
      "env-a",
    ),
    createTestProvisionRequestTarget("actions", "account-b", "repo-a"),
    createTestProvisionRequestTarget("codespaces", "account-b", "repo-a"),
    createTestProvisionRequestTarget("dependabot", "account-b", "repo-a"),
  ] satisfies ProvisionRequestTarget[]);
});

it("supports unshared token declarations", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoX: RepoReference = { account: "account-x", repo: "repo-x" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createTestAppRegistry();
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
  ).toStrictEqual(
    createTestProvisionRequest({
      requester: repoX,
      name: "SECRET_X",
      secretDec: secretDecA,
      tokenDec: undefined,
      to: [],
    }),
  );
});

it("supports undefined token declarations", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoX: RepoReference = { account: "account-x", repo: "repo-x" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createTestAppRegistry();
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
  ).toStrictEqual(
    createTestProvisionRequest({
      requester: repoX,
      name: "SECRET_X",
      secretDec: secretDecA,
      tokenDec: undefined,
      tokenDecIsRegistered: false,
      to: [],
    }),
  );
});
