import { Octokit } from "@octokit/action";
import { expect, it } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import { createOctokitFactory } from "../../../src/octokit.js";
import { createFindProvisionerOctokit } from "../../../src/provisioner-octokit.js";
import type { AppInput } from "../../../src/type/input.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";

it("can find octokit instances for provisioners", () => {
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
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
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
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
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
