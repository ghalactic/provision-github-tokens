import { expect, it } from "vitest";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import { createAppRegistry } from "./app-registry.js";
import { createRepoRegistry } from "./repo-registry.js";

it("registers each discovered repo with the repo registry", () => {
  const [[accountA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const appA = createTestApp("App A");
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    accountA,
    "selected",
  );

  const repoRegistry = createRepoRegistry();
  const appRegistry = createAppRegistry(repoRegistry);

  appRegistry.registerApp({
    app: appA,
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  });
  appRegistry.registerInstallation({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });

  expect(repoRegistry.find({ account: accountA.login, repo: repoA.name })).toBe(
    repoA,
  );
  expect(repoRegistry.find({ account: accountA.login, repo: repoB.name })).toBe(
    repoB,
  );
});
