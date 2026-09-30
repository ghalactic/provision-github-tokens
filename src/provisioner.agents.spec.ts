import { join } from "node:path";
import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  __getOrgSecrets,
  __getRepoSecrets,
  __reset as __resetOctokit,
  __setEnvironments,
  __setErrors,
  __setOrgKeys,
  __setRepoKeys,
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
  createTestProvisionRequest,
  createTestProvisionRequestTarget,
} from "../test/provision-request.js";
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

const fixturesPath = join(import.meta.dirname, "testdata/provisioner/agents");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("handles GitHub API errors when provisioning org-level Agents secrets", async () => {
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
  const accountAAgentsKey = await createTestKeyPair("agents.account-a");

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { agents: accountAAgentsKey });

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));
  encryptSecret.mockResolvedValue(["XXXX", "XXXX"]);

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { agents: true } } },
        }),
        to: [createTestProvisionRequestTarget("agents")],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("agents"),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Agents secret in account-a: 401 - Unauthorized
    ::debug::      (no response data)

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "org-request-error/a.md"));
});

it("handles unexpected errors when provisioning org-level Agents secrets", async () => {
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
  const accountAAgentsKey = await createTestKeyPair("agents.account-a");

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { agents: accountAAgentsKey });

  const error = new Error("<message>");
  error.stack = "Error: <message>\n    at provisioner.ts:1:1";
  __setErrors("agents.createOrUpdateOrgSecret", [error]);

  const appRegistry = createTestAppRegistry({
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
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { agents: true } } },
        }),
        to: [createTestProvisionRequestTarget("agents")],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("agents"),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Agents secret in account-a: <message>
    ::debug::      Error: <message>
    ::debug::          at provisioner.ts:1:1

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "org-unexpected-error/a.md"));
});

it("can provision org-level Agents secrets", async () => {
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
  const accountAAgentsKey = await createTestKeyPair("agents.account-a");

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { agents: accountAAgentsKey });

  const appRegistry = createTestAppRegistry({
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
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { agents: true } } },
        }),
        to: [createTestProvisionRequestTarget("agents")],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("agents"),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOrgSecrets("account-a")).toEqual({
    actions: {},
    agents: { SECRET_A: "<token-a>" },
    codespaces: {},
    dependabot: {},
  });
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Agents secret in account-a

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "org/a.md"));
});

it("handles GitHub API errors when provisioning repo-level Agents secrets", async () => {
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
  const accountARepoAAgentsKey = await createTestKeyPair(
    "agents.account-a/repo-a",
  );

  __setEnvironments([[repoA, [envA]]]);
  __setRepoKeys("account-a", "repo-a", {
    agents: accountARepoAAgentsKey,
  });

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));
  encryptSecret.mockResolvedValue(["XXXX", "XXXX"]);

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { agents: true } } },
        }),
        to: [createTestProvisionRequestTarget("agents", "account-a", "repo-a")],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "agents",
            "account-a",
            "repo-a",
          ),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Agents secret in account-a/repo-a: 401 - Unauthorized
    ::debug::      (no response data)

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "repo-request-error/a.md"));
});

it("handles unexpected errors when provisioning repo-level Agents secrets", async () => {
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
  const accountARepoAAgentsKey = await createTestKeyPair(
    "agents.account-a/repo-a",
  );

  __setEnvironments([[repoA, [envA]]]);
  __setRepoKeys("account-a", "repo-a", {
    agents: accountARepoAAgentsKey,
  });

  const error = new Error("<message>");
  error.stack = "Error: <message>\n    at provisioner.ts:1:1";
  __setErrors("agents.createOrUpdateRepoSecret", [error]);

  const appRegistry = createTestAppRegistry({
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
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { agents: true } } },
        }),
        to: [createTestProvisionRequestTarget("agents", "account-a", "repo-a")],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "agents",
            "account-a",
            "repo-a",
          ),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Agents secret in account-a/repo-a: <message>
    ::debug::      Error: <message>
    ::debug::          at provisioner.ts:1:1

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "repo-unexpected-error/a.md"));
});

it("can provision repo-level Agents secrets", async () => {
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
  const accountARepoAAgentsKey = await createTestKeyPair(
    "agents.account-a/repo-a",
  );

  __setEnvironments([[repoA, [envA]]]);
  __setRepoKeys("account-a", "repo-a", {
    agents: accountARepoAAgentsKey,
  });

  const appRegistry = createTestAppRegistry({
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
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { agents: true } } },
        }),
        to: [createTestProvisionRequestTarget("agents", "account-a", "repo-a")],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "agents",
            "account-a",
            "repo-a",
          ),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getRepoSecrets("account-a", "repo-a")).toEqual({
    actions: {},
    agents: { SECRET_A: "<token-a>" },
    codespaces: {},
    dependabot: {},
  });
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Agents secret in account-a/repo-a

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "repo/a.md"));
});
