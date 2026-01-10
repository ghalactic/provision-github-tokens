import { beforeEach, expect, it, vi } from "vitest";
import { __reset as __resetCore } from "../../../__mocks__/@actions/core.js";
import {
  __reset as __resetOctokit,
  __setApps,
  __setInstallations,
  __setOrgKeys,
  __setRepoKeys,
} from "../../../__mocks__/@octokit/action.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import { createEncryptSecret } from "../../../src/encrypt-secret.js";
import { createOctokitFactory } from "../../../src/octokit.js";
import { createFindProvisionerOctokit } from "../../../src/provisioner-octokit.js";
import type { AppInput } from "../../../src/type/input.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";
import { createTestKeyPair, decrypt } from "../../key.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("can encrypt secrets for all secret types", async () => {
  const octokitFactory = createOctokitFactory();

  const accountA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A", { metadata: "read" });
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

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA]]]);

  const orgAActionsKey = await createTestKeyPair("1111");
  const orgACodespacesKey = await createTestKeyPair("2222");
  const orgADependabotKey = await createTestKeyPair("3333");
  __setOrgKeys("org-a", {
    actions: orgAActionsKey,
    codespaces: orgACodespacesKey,
    dependabot: orgADependabotKey,
  });

  const repoAActionsKey = await createTestKeyPair("4444");
  const repoACodespacesKey = await createTestKeyPair("5555");
  const repoADependabotKey = await createTestKeyPair("6666");
  const envAKey = await createTestKeyPair("7777");
  const envBKey = await createTestKeyPair("8888");
  __setRepoKeys("org-a", "repo-a", {
    actions: repoAActionsKey,
    codespaces: repoACodespacesKey,
    dependabot: repoADependabotKey,
    environments: {
      "env-a": envAKey,
      "env-b": envBKey,
    },
  });

  const encryptSecret = createEncryptSecret(findProvisionerOctokit);

  const forOrgAActions = await encryptSecret(
    { platform: "github", type: "actions", target: { account: "org-a" } },
    "<plaintext>",
  );

  expect(await decrypt(orgAActionsKey, forOrgAActions[0])).toBe("<plaintext>");
  expect(forOrgAActions[1]).toBe("1111");

  const forOrgACodespaces = await encryptSecret(
    { platform: "github", type: "codespaces", target: { account: "org-a" } },
    "<plaintext>",
  );

  expect(await decrypt(orgACodespacesKey, forOrgACodespaces[0])).toBe(
    "<plaintext>",
  );
  expect(forOrgACodespaces[1]).toBe("2222");

  const forOrgADependabot = await encryptSecret(
    { platform: "github", type: "dependabot", target: { account: "org-a" } },
    "<plaintext>",
  );

  expect(await decrypt(orgADependabotKey, forOrgADependabot[0])).toBe(
    "<plaintext>",
  );
  expect(forOrgADependabot[1]).toBe("3333");

  const forRepoAActions = await encryptSecret(
    {
      platform: "github",
      type: "actions",
      target: { account: "org-a", repo: "repo-a" },
    },
    "<plaintext>",
  );

  expect(await decrypt(repoAActionsKey, forRepoAActions[0])).toBe(
    "<plaintext>",
  );
  expect(forRepoAActions[1]).toBe("4444");

  const forRepoACodespaces = await encryptSecret(
    {
      platform: "github",
      type: "codespaces",
      target: { account: "org-a", repo: "repo-a" },
    },
    "<plaintext>",
  );

  expect(await decrypt(repoACodespacesKey, forRepoACodespaces[0])).toBe(
    "<plaintext>",
  );
  expect(forRepoACodespaces[1]).toBe("5555");

  const forRepoADependabot = await encryptSecret(
    {
      platform: "github",
      type: "dependabot",
      target: { account: "org-a", repo: "repo-a" },
    },
    "<plaintext>",
  );

  expect(await decrypt(repoADependabotKey, forRepoADependabot[0])).toBe(
    "<plaintext>",
  );
  expect(forRepoADependabot[1]).toBe("6666");

  const forEnvA = await encryptSecret(
    {
      platform: "github",
      type: "environment",
      target: { account: "org-a", repo: "repo-a", environment: "env-a" },
    },
    "<plaintext>",
  );

  expect(await decrypt(envAKey, forEnvA[0])).toBe("<plaintext>");
  expect(forEnvA[1]).toBe("7777");

  const forEnvB = await encryptSecret(
    {
      platform: "github",
      type: "environment",
      target: { account: "org-a", repo: "repo-a", environment: "env-b" },
    },
    "<plaintext>",
  );

  expect(await decrypt(envBKey, forEnvB[0])).toBe("<plaintext>");
  expect(forEnvB[1]).toBe("8888");
});

it("throws if no provisioners are found for the target", async () => {
  const encryptSecret = createEncryptSecret(
    createFindProvisionerOctokit(
      createOctokitFactory(),
      createAppRegistry(),
      [],
    ),
  );

  await expect(
    encryptSecret(
      { platform: "github", type: "actions", target: { account: "org-a" } },
      "<plaintext>",
    ),
  ).rejects.toThrow("No provisioners found for target org-a");
});
