import { beforeEach, expect, it, vi } from "vitest";
import { __reset as __resetCore } from "../../../__mocks__/@actions/core.js";
import {
  __reset as __resetOctokit,
  __setApps,
  __setInstallations,
  __setOrgPublicKeys,
} from "../../../__mocks__/@octokit/action.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import { createOctokitFactory } from "../../../src/octokit.js";
import { createFindProvisionerOctokit } from "../../../src/provisioner-octokit.js";
import { createSecretEncrypter } from "../../../src/secret-encrypter.js";
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

  const orgAActionsKey = await createTestKeyPair("1111");
  const orgACodespacesKey = await createTestKeyPair("2222");

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA]]]);
  __setOrgPublicKeys("org-a", {
    actions: orgAActionsKey.githubPublic,
    codespaces: orgACodespacesKey.githubPublic,
  });

  const encryptSecret = createSecretEncrypter(findProvisionerOctokit);

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
});
