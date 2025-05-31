import { Octokit } from "@octokit/action";
import { expect, it } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import { createFindIssuerOctokit } from "../../../src/issuer-octokit.js";
import { createOctokitFactory } from "../../../src/octokit.js";
import type { TokenRequest } from "../../../src/token-request.js";
import type { AppInput } from "../../../src/type/input.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";

it("can find octokit instances for issuers", () => {
  const octokitFactory = createOctokitFactory();

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A", {
    contents: "read",
    metadata: "read",
  });
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA = createTestInstallation(111, appA, accountA, "all");
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA],
  };
  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const appsInput: AppInput[] = [
    {
      appId: 110,
      privateKey: "<private key A>",
      issuer: { enabled: true, roles: [] },
      provisioner: { enabled: false },
    },
  ];
  const findIssuerOctokit = createFindIssuerOctokit(
    octokitFactory,
    appRegistry,
    appsInput,
  );

  const tokenReq: TokenRequest = {
    consumer: { account: "account-a" },
    tokenDec: {
      shared: false,
      as: undefined,
      account: "account-a",
      repos: "all",
      permissions: { metadata: "read" },
    },
    repos: "all",
  };

  const actualA = findIssuerOctokit(tokenReq);
  const actualB = findIssuerOctokit(tokenReq);

  expect(actualA?.[0]).toBeInstanceOf(Octokit);
  expect(actualA?.[1]).toEqual(appAInstallationRegA);
  expect(actualB?.[0]).toBe(actualA?.[0]);
  expect(actualB?.[1]).toBe(actualA?.[1]);
});

it("returns undefined if no matching installation is found", () => {
  const octokitFactory = createOctokitFactory();

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A", {
    contents: "read",
    metadata: "read",
  });
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA = createTestInstallation(111, appA, accountA, "all");
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA],
  };
  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const appsInput: AppInput[] = [
    {
      appId: 110,
      privateKey: "<private key A>",
      issuer: { enabled: true, roles: [] },
      provisioner: { enabled: false },
    },
  ];
  const findIssuerOctokit = createFindIssuerOctokit(
    octokitFactory,
    appRegistry,
    appsInput,
  );

  const actualA = findIssuerOctokit({
    consumer: { account: "account-a" },
    tokenDec: {
      shared: false,
      as: undefined,
      account: "account-b",
      repos: "all",
      permissions: { metadata: "read" },
    },
    repos: "all",
  });

  expect(actualA).toBeUndefined();
});
