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
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

  const appRegistry = createAppRegistry();

  expect(() => {
    appRegistry.registerInstallation({
      installation: appAInstallationA,
      repos: [],
    });
  }).toThrow(`App ${appA.id} not registered`);
});
