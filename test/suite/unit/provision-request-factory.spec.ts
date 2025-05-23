import { expect, it, vi } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import {
  createEnvRef,
  type AccountReference,
  type RepoReference,
} from "../../../src/github-reference.js";
import {
  createProvisionRequestFactory,
  type ProvisionRequest,
} from "../../../src/provision-request.js";
import { createTokenDeclarationRegistry } from "../../../src/token-declaration-registry.js";
import { normalizeTokenReference } from "../../../src/token-reference.js";
import { createTestSecretDec, createTestTokenDec } from "../../declaration.js";
import { createTestEnvironmentResolver } from "../../environment-resolver.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
} from "../../github-api.js";

vi.mock("@actions/core");

it("creates provision requests from secret declarations", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoX: RepoReference = { account: "account-x", repo: "repo-x" };

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

  const secretDecA = createTestSecretDec({
    token: normalizeTokenReference(repoA, "token-a"),
  });

  expect(
    await createProvisionRequest(repoA, "SECRET_A", secretDecA),
  ).toStrictEqual({
    requester: repoA,
    name: "SECRET_A",
    secretDec: secretDecA,
    tokenDec: tokenDecA,
    to: [],
  } satisfies ProvisionRequest);
  expect(
    await createProvisionRequest(repoX, "SECRET_X", secretDecA),
  ).toStrictEqual({
    requester: repoX,
    name: "SECRET_X",
    secretDec: secretDecA,
    tokenDec: tokenDecA,
    to: [],
  } satisfies ProvisionRequest);
});

it("supports same-account targets", async () => {
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
  ).toStrictEqual([{ platform: "github", type: "actions", target: accountA }]);

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
  ]);

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
  ]);
});

it("supports account pattern targets", async () => {
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
  ]);

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
  ]);

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
  ]);

  // TODO: Test pattern overlap
});

it("supports same-repo targets", async () => {
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
          github: { repo: { actions: true } },
        }),
      )
    )?.to,
  ).toStrictEqual([{ platform: "github", type: "actions", target: repoA }]);

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
  ).toStrictEqual([{ platform: "github", type: "codespaces", target: repoA }]);

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
  ).toStrictEqual([{ platform: "github", type: "dependabot", target: repoA }]);
});

it("supports same-repo environment targets", async () => {
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

it("returns undefined for unshared token declarations", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoX: RepoReference = { account: "account-x", repo: "repo-x" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

  const tokenDecA = createTestTokenDec({ shared: false });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const secretDecA = createTestSecretDec({
    token: normalizeTokenReference(repoA, "token-a"),
  });

  expect(
    await createProvisionRequest(repoX, "SECRET_A", secretDecA),
  ).toBeUndefined();
});

it("returns undefined for unknown token declarations", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
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
    await createProvisionRequest(repoA, "SECRET_A", secretDecA),
  ).toBeUndefined();
});
