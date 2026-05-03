import { expect, it } from "vitest";
import {
  createTestApps,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import { createAppRegistry } from "./app-registry.js";

it("doesn't allow registering an installation of an app that isn't registered", () => {
  const [[accountA]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
  ]);
  const [[, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    {},
    [[111, accountA, "selected"]],
  ]);

  const appRegistry = createAppRegistry();

  expect(() => {
    appRegistry.registerInstallation({
      installation: appAInstallationA,
      repos: [],
    });
  }).toThrow("App 110 not registered");
});
