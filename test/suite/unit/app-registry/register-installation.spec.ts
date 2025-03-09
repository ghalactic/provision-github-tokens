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

it("doesn't allow registering an installation of an app that is not registered", () => {
  const accountA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationRegA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, accountA, "selected"),
    repos: [],
  };

  const appRegistry = createAppRegistry();

  expect(() => {
    appRegistry.registerInstallation(appAInstallationRegA);
  }).toThrow("App 110 not registered");
});
