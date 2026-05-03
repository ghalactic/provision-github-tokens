import { beforeEach, expect, it, vi } from "vitest";
import { __reset as __resetCore } from "../__mocks__/@actions/core.js";
import {
  __reset as __resetOctokit,
  __setOrgKeys,
  __setRepoKeys,
} from "../__mocks__/@octokit/action.js";
import { createTestAppRegistry } from "../test/app-registry.js";
import {
  createTestApps,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import { createTestKeyPair, decrypt } from "../test/key.js";
import { createTestOctokitFactory } from "../test/octokit-factory.js";
import { createTestProvisionRequestTarget } from "../test/provision-request.js";
import { createEncryptSecret } from "./encrypt-secret.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("can encrypt secrets for all secret types", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

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
    createTestProvisionRequestTarget("actions", "org-a"),
    "<plaintext>",
  );

  expect(await decrypt(orgAActionsKey, forOrgAActions[0])).toBe("<plaintext>");
  expect(forOrgAActions[1]).toBe("1111");

  const forOrgACodespaces = await encryptSecret(
    createTestProvisionRequestTarget("codespaces", "org-a"),
    "<plaintext>",
  );

  expect(await decrypt(orgACodespacesKey, forOrgACodespaces[0])).toBe(
    "<plaintext>",
  );
  expect(forOrgACodespaces[1]).toBe("2222");

  const forOrgADependabot = await encryptSecret(
    createTestProvisionRequestTarget("dependabot", "org-a"),
    "<plaintext>",
  );

  expect(await decrypt(orgADependabotKey, forOrgADependabot[0])).toBe(
    "<plaintext>",
  );
  expect(forOrgADependabot[1]).toBe("3333");

  const forRepoAActions = await encryptSecret(
    createTestProvisionRequestTarget("actions", "org-a", "repo-a"),
    "<plaintext>",
  );

  expect(await decrypt(repoAActionsKey, forRepoAActions[0])).toBe(
    "<plaintext>",
  );
  expect(forRepoAActions[1]).toBe("4444");

  const forRepoACodespaces = await encryptSecret(
    createTestProvisionRequestTarget("codespaces", "org-a", "repo-a"),
    "<plaintext>",
  );

  expect(await decrypt(repoACodespacesKey, forRepoACodespaces[0])).toBe(
    "<plaintext>",
  );
  expect(forRepoACodespaces[1]).toBe("5555");

  const forRepoADependabot = await encryptSecret(
    createTestProvisionRequestTarget("dependabot", "org-a", "repo-a"),
    "<plaintext>",
  );

  expect(await decrypt(repoADependabotKey, forRepoADependabot[0])).toBe(
    "<plaintext>",
  );
  expect(forRepoADependabot[1]).toBe("6666");

  const forEnvA = await encryptSecret(
    createTestProvisionRequestTarget("environment", "org-a", "repo-a", "env-a"),
    "<plaintext>",
  );

  expect(await decrypt(envAKey, forEnvA[0])).toBe("<plaintext>");
  expect(forEnvA[1]).toBe("7777");

  const forEnvB = await encryptSecret(
    createTestProvisionRequestTarget("environment", "org-a", "repo-a", "env-b"),
    "<plaintext>",
  );

  expect(await decrypt(envBKey, forEnvB[0])).toBe("<plaintext>");
  expect(forEnvB[1]).toBe("8888");
});

it("throws if no provisioners are found for the target", async () => {
  const emptyRegistry = createTestAppRegistry();
  const { findProvisionerOctokit } = createTestOctokitFactory(emptyRegistry);
  const encryptSecret = createEncryptSecret(findProvisionerOctokit);

  await expect(
    encryptSecret(
      createTestProvisionRequestTarget("actions", "org-a"),
      "<plaintext>",
    ),
  ).rejects.toThrow("No provisioners found for target org-a");
});
