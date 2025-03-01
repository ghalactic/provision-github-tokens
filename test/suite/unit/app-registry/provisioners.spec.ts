import { expect, it } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../../src/app-registry.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
} from "../../../github-api.js";

it("returns all of the provisioners", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [],
  };
  const appB: AppRegistration = {
    app: createTestApp(120, "app-b", "App B"),
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appBInstallationA: InstallationRegistration = {
    installation: createTestInstallation(121, appB.app, orgA, "selected"),
    repos: [],
  };
  const appC: AppRegistration = {
    app: createTestApp(130, "app-c", "App C"),
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: true },
  };
  const appCInstallationA: InstallationRegistration = {
    installation: createTestInstallation(131, appC.app, orgA, "selected"),
    repos: [],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);
  appRegistry.registerApp(appB);
  appRegistry.registerInstallation(appBInstallationA);
  appRegistry.registerApp(appC);
  appRegistry.registerInstallation(appCInstallationA);

  expect(appRegistry.provisioners).toEqual(
    new Map([
      [appAInstallationA.installation.id, appAInstallationA],
      [appCInstallationA.installation.id, appCInstallationA],
    ]),
  );
});
