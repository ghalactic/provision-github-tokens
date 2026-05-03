import { Octokit } from "@octokit/action";
import { expect, it } from "vitest";
import {
  createTestApps,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "./app-registry.js";
import { createOctokitFactory } from "./octokit.js";
import { createFindProvisionerOctokit } from "./provisioner-octokit.js";
import type { AppInput } from "./type/input.js";

it("can find octokit instances for provisioners", () => {
  const octokitFactory = createOctokitFactory();

  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { contents: "read", metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA],
  };
  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const appsInput: AppInput[] = [
    {
      appId: appA.id,
      privateKey: appA.privateKey,
      issuer: { enabled: false, roles: [] },
      provisioner: { enabled: true },
    },
  ];
  const findProvisionerOctokit = createFindProvisionerOctokit(
    octokitFactory,
    appRegistry,
    appsInput,
  );

  const actualA = findProvisionerOctokit({ account: "account-a" });
  const actualB = findProvisionerOctokit({ account: "account-a" });

  expect(actualA?.[0]).toBeInstanceOf(Octokit);
  expect(actualA?.[1]).toEqual(appAInstallationRegA);
  expect(actualB?.[0]).toBe(actualA?.[0]);
  expect(actualB?.[1]).toBe(actualA?.[1]);
});

it("returns undefined if no matching installation is found", () => {
  const octokitFactory = createOctokitFactory();

  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { contents: "read", metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA],
  };
  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const appsInput: AppInput[] = [
    {
      appId: appA.id,
      privateKey: appA.privateKey,
      issuer: { enabled: false, roles: [] },
      provisioner: { enabled: true },
    },
  ];
  const findProvisionerOctokit = createFindProvisionerOctokit(
    octokitFactory,
    appRegistry,
    appsInput,
  );

  const actualA = findProvisionerOctokit({ account: "account-b" });

  expect(actualA).toBeUndefined();
});
