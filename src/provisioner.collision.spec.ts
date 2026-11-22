import { join } from "node:path";
import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  __getOrgSecrets,
  __reset as __resetOctokit,
  __setEnvironments,
  __setOrgKeys,
} from "../__mocks__/@octokit/action.js";
import { createTestAppRegistry } from "../test/app-registry.js";
import { createTestSecretDec } from "../test/declaration.js";
import {
  createTestApps,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import { createTestKeyPair } from "../test/key.js";
import { createTestOctokitFactory } from "../test/octokit-factory.js";
import {
  createTestAccountProvisionRequestTarget,
  createTestProvisionRequest,
} from "../test/provision-request.js";
import { createTestRepoRegistry } from "../test/repo-registry.js";
import {
  createTestProvisionAuthTargetResult,
  createTestTokenAuthResult,
} from "../test/result.js";
import { createEncryptSecret } from "./encrypt-secret.js";
import { toMarkdown } from "./markdown.js";
import { createMarkdownProvisionExplainer } from "./provision-explainer/markdown.js";
import { createProvisioner } from "./provisioner.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

const fixturesPath = join(
  import.meta.dirname,
  "testdata/provisioner/collision",
);

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("refuses to provision a colliding target", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { actions: accountAActionsKey });

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const targetResult = createTestProvisionAuthTargetResult({
    target: createTestAccountProvisionRequestTarget(
      "actions",
      "account-a",
      "private",
    ),
    tokenAuthResult,
  });

  const collision = {
    isBlocking: true,
    participants: [
      {
        requester: { account: "account-b", repo: "repo-b" },
        name: "SECRET_A",
        token: "account-b/repo-b.token",
      },
    ],
  };

  const [[resultA, targetResultsA]] = await provisionSecrets(
    new Map(),
    [
      {
        request: createTestProvisionRequest({
          secretDec: createTestSecretDec({
            github: { accounts: { "account-a": { actions: "private" } } },
          }),
        }),
        results: [targetResult],
        isMissingTargets: false,
        isAllowed: true,
      },
    ],
    new Map([[targetResult, collision]]),
  );

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOrgSecrets("account-a")).toBeUndefined();
  expect(targetResultsA.get(targetResult)).toEqual({
    type: "COLLISION",
    collision,
  });
  expect(encryptSecret).not.toHaveBeenCalled();
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Conflicting declarations were found for GitHub Actions secret in account-a
        ❌ Would've been readable by private repos

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "org.md"));
});
