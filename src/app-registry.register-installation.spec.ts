import { expect, it } from "vitest";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
} from "../test/github-api.js";
import { createAppRegistry } from "./app-registry.js";

it("doesn't allow registering an installation of an app that isn't registered", () => {
  const accountA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A");
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    accountA,
    "selected",
  );

  const appRegistry = createAppRegistry();

  expect(() => {
    appRegistry.registerInstallation({
      installation: appAInstallationA,
      repos: [],
    });
  }).toThrow("App 110 not registered");
});
