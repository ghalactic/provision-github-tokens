import { expect, it } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import type { ProvisionRequestTarget } from "../../../src/provision-request.js";
import {
  createTokenRequestFactory,
  type TokenRequest,
} from "../../../src/token-request.js";
import { createTestSecretDec, createTestTokenDec } from "../../declaration.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";

it("creates token requests from provision requests with token declarations for all repos", () => {
  const appRegistry = createAppRegistry();
  const createTokenRequests = createTokenRequestFactory(appRegistry);
  const tokenDec = createTestTokenDec({ repos: "all" });

  const targetA: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-y" },
  };
  const targetB: ProvisionRequestTarget = {
    platform: "github",
    type: "codespaces",
    target: { account: "account-z", repo: "repo-z" },
  };

  expect(
    createTokenRequests({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [targetA, targetB],
    }),
  ).toStrictEqual(
    new Map<ProvisionRequestTarget, TokenRequest>([
      [targetA, { consumer: { account: "account-y" }, tokenDec, repos: "all" }],
      [
        targetB,
        {
          consumer: { account: "account-z", repo: "repo-z" },
          tokenDec,
          repos: "all",
        },
      ],
    ]),
  );
});

it("creates token requests from provision requests with token declarations for selected repos", () => {
  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA1 = createTestInstallationRepo(accountA, "repo-a-1");
  const repoA2 = createTestInstallationRepo(accountA, "repo-a-2");
  const repoB = createTestInstallationRepo(accountA, "repo-b");
  const repoC = createTestInstallationRepo(accountA, "repo-c");
  const appA = createTestApp(110, "app-a", "App A");
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA = createTestInstallation(111, appA, accountA, "all");
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA1, repoA2, repoB, repoC],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const createTokenRequests = createTokenRequestFactory(appRegistry);
  const tokenDec = createTestTokenDec({ repos: ["repo-a-*", "repo-b"] });

  const targetA: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-y" },
  };
  const targetB: ProvisionRequestTarget = {
    platform: "github",
    type: "codespaces",
    target: { account: "account-z", repo: "repo-z" },
  };

  expect(
    createTokenRequests({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [targetA, targetB],
    }),
  ).toStrictEqual(
    new Map<ProvisionRequestTarget, TokenRequest>([
      [
        targetA,
        {
          consumer: { account: "account-y" },
          tokenDec,
          repos: ["repo-a-1", "repo-a-2", "repo-b"],
        },
      ],
      [
        targetB,
        {
          consumer: { account: "account-z", repo: "repo-z" },
          tokenDec,
          repos: ["repo-a-1", "repo-a-2", "repo-b"],
        },
      ],
    ]),
  );
});

it("creates empty token requests from provision requests with no token declaration", () => {
  const appRegistry = createAppRegistry();
  const createTokenRequests = createTokenRequestFactory(appRegistry);
  const tokenDec = createTestTokenDec({ repos: "all" });

  expect(
    createTokenRequests({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: undefined,
      tokenDecIsRegistered: false,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-y" },
        },
        {
          platform: "github",
          type: "codespaces",
          target: { account: "account-z", repo: "repo-z" },
        },
      ],
    }),
  ).toStrictEqual(new Map());
});

it("creates normalized token requests", () => {
  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA1 = createTestInstallationRepo(accountA, "repo-a-1");
  const repoA2 = createTestInstallationRepo(accountA, "repo-a-2");
  const repoB = createTestInstallationRepo(accountA, "repo-b");
  const repoC = createTestInstallationRepo(accountA, "repo-c");
  const appA = createTestApp(110, "app-a", "App A");
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA = createTestInstallation(111, appA, accountA, "all");
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoC, repoB, repoA2, repoA1],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const createTokenRequests = createTokenRequestFactory(appRegistry);
  const tokenDec = createTestTokenDec({ repos: ["repo-b", "repo-a-*"] });
  const expectedTokenDec = createTestTokenDec({
    repos: ["repo-a-*", "repo-b"],
  });

  const targetA: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-y" },
  };
  const targetB: ProvisionRequestTarget = {
    platform: "github",
    type: "codespaces",
    target: { account: "account-z", repo: "repo-z" },
  };

  expect(
    createTokenRequests({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [targetA, targetB],
    }),
  ).toStrictEqual(
    new Map<ProvisionRequestTarget, TokenRequest>([
      [
        targetA,
        {
          consumer: { account: "account-y" },
          tokenDec: expectedTokenDec,
          repos: ["repo-a-1", "repo-a-2", "repo-b"],
        },
      ],
      [
        targetB,
        {
          consumer: { account: "account-z", repo: "repo-z" },
          tokenDec: expectedTokenDec,
          repos: ["repo-a-1", "repo-a-2", "repo-b"],
        },
      ],
    ]),
  );
});

it("de-duplicates equivalent token requests", () => {
  const appRegistry = createAppRegistry();
  const createTokenRequests = createTokenRequestFactory(appRegistry);
  const tokenDec = createTestTokenDec({ repos: "all" });

  const targetA: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-y" },
  };
  const targetB: ProvisionRequestTarget = {
    platform: "github",
    type: "codespaces",
    target: { account: "account-z", repo: "repo-z" },
  };

  const targetC: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-z", repo: "repo-z" },
  };
  const targetD: ProvisionRequestTarget = {
    platform: "github",
    type: "environment",
    target: { account: "account-z", repo: "repo-z", environment: "env-z" },
  };
  const targetE: ProvisionRequestTarget = {
    platform: "github",
    type: "codespaces",
    target: { account: "account-y", repo: "repo-y" },
  };
  const targetF: ProvisionRequestTarget = {
    platform: "github",
    type: "dependabot",
    target: { account: "account-y" },
  };

  const actualA = createTokenRequests({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec,
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [targetA, targetB],
  });
  const actualB = createTokenRequests({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec,
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [targetC, targetD, targetE, targetF],
  });

  expect(actualB.get(targetC)).toBe(actualA.get(targetB));
  expect(actualB.get(targetD)).toBe(actualA.get(targetB));
  expect(actualB.get(targetE)).not.toBe(actualA.get(targetA));
  expect(actualB.get(targetE)).not.toBe(actualA.get(targetB));
  expect(actualB.get(targetF)).toBe(actualA.get(targetA));
});
