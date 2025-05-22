import { expect, it } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
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

  expect(
    createTokenRequests({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec,
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
  ).toStrictEqual([
    {
      consumer: { account: "account-y" },
      tokenDec,
      repos: "all",
    },
    {
      consumer: { account: "account-z", repo: "repo-z" },
      tokenDec,
      repos: "all",
    },
  ] satisfies TokenRequest[]);
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

  expect(
    createTokenRequests({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec,
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
  ).toStrictEqual([
    {
      consumer: { account: "account-y" },
      tokenDec,
      repos: ["repo-a-1", "repo-a-2", "repo-b"],
    },
    {
      consumer: { account: "account-z", repo: "repo-z" },
      tokenDec,
      repos: ["repo-a-1", "repo-a-2", "repo-b"],
    },
  ] satisfies TokenRequest[]);
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

  expect(
    createTokenRequests({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec,
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
  ).toStrictEqual([
    {
      consumer: { account: "account-y" },
      tokenDec: expectedTokenDec,
      repos: ["repo-a-1", "repo-a-2", "repo-b"],
    },
    {
      consumer: { account: "account-z", repo: "repo-z" },
      tokenDec: expectedTokenDec,
      repos: ["repo-a-1", "repo-a-2", "repo-b"],
    },
  ] satisfies TokenRequest[]);
});

it("de-duplicates equivalent token requests", () => {
  const appRegistry = createAppRegistry();
  const createTokenRequests = createTokenRequestFactory(appRegistry);
  const tokenDec = createTestTokenDec({ repos: "all" });

  const [requestA, requestB] = createTokenRequests({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec,
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
  });
  const [requestC, requestD, requestE] = createTokenRequests({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-z", repo: "repo-z" },
      },
      {
        platform: "github",
        type: "codespaces",
        target: { account: "account-y", repo: "repo-y" },
      },
      {
        platform: "github",
        type: "dependabot",
        target: { account: "account-y" },
      },
    ],
  });

  expect(requestC).toBe(requestB);
  expect(requestE).toBe(requestA);
  expect(requestD).not.toBe(requestA);
  expect(requestD).not.toBe(requestB);
});
