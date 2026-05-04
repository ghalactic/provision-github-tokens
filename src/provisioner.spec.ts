import { beforeEach, expect, it, vi, type Mock } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  __getEnvSecrets,
  __getOrgSecrets,
  __getRepoSecrets,
  __reset as __resetOctokit,
  __setEnvironments,
  __setErrors,
  __setOrgKeys,
  __setRepoKeys,
  TestRequestError,
} from "../__mocks__/@octokit/action.js";
import { createTestAppRegistry } from "../test/app-registry.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../test/declaration.js";
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
  createTestProvisionAuthResult,
  createTestProvisionAuthTargetResult,
  createTestTokenAuthResult,
} from "../test/result.js";
import { createEncryptSecret, type EncryptSecret } from "./encrypt-secret.js";
import type { ProvisionRequestTarget } from "./provision-request.js";
import { createProvisioner, type Provisioner } from "./provisioner.js";
import type { ProvisionAuthResult } from "./type/provision-auth-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

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
const accountARepoAActionsKey = await createTestKeyPair(
  "actions.account-a/repo-a",
);

const accountACodespacesKey = await createTestKeyPair("codespaces.account-a");
const accountARepoACodespacesKey = await createTestKeyPair(
  "codespaces.account-a/repo-a",
);

const accountADependabotKey = await createTestKeyPair("dependabot.account-a");
const accountARepoADependabotKey = await createTestKeyPair(
  "dependabot.account-a/repo-a",
);

const accountARepoAEnvAKey = await createTestKeyPair(
  "environment.account-a/repo-a/env-a",
);

const tokenDecB = createTestTokenDec({ permissions: { contents: "write" } });

const secretDecA = createTestSecretDec({
  github: { accounts: { "account-a": { actions: true } } },
});
const secretDecB = createTestSecretDec({
  github: { repos: { "account-a/repo-a": { codespaces: true } } },
});

const tokenAuthResultA = createTestTokenAuthResult();
const tokenAuthResultB = createTestTokenAuthResult();

const tokenCreationResultCreatedA: TokenCreationResult = {
  type: "CREATED",
  token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
};
const tokenCreationResultCreatedB: TokenCreationResult = {
  type: "CREATED",
  token: { token: "<token-b>", expires_at: "2001-02-03T04:05:06Z" },
};
const tokenCreationResultNotCreated: TokenCreationResult = {
  type: "NO_ISSUER",
};

const accountAActionsTarget: ProvisionRequestTarget =
  createTestProvisionRequestTarget("actions");
const accountARepoAActionsTarget: ProvisionRequestTarget =
  createTestProvisionRequestTarget("actions", "account-a", "repo-a");

const accountACodespacesTarget: ProvisionRequestTarget =
  createTestProvisionRequestTarget("codespaces");
const accountARepoACodespacesTarget: ProvisionRequestTarget =
  createTestProvisionRequestTarget("codespaces", "account-a", "repo-a");

const accountADependabotTarget: ProvisionRequestTarget =
  createTestProvisionRequestTarget("dependabot");
const accountARepoADependabotTarget: ProvisionRequestTarget =
  createTestProvisionRequestTarget("dependabot", "account-a", "repo-a");

const accountARepoAEnvATarget: ProvisionRequestTarget =
  createTestProvisionRequestTarget(
    "environment",
    "account-a",
    "repo-a",
    "env-a",
  );

const accountXActionsTarget: ProvisionRequestTarget =
  createTestProvisionRequestTarget("actions", "account-x");

let encryptSecret: Mock<EncryptSecret>;
let provisionSecrets: Provisioner;

beforeEach(() => {
  __resetCore();
  __resetOctokit();

  __setEnvironments([[repoA, [envA]]]);

  __setOrgKeys("account-a", {
    actions: accountAActionsKey,
    codespaces: accountACodespacesKey,
    dependabot: accountADependabotKey,
  });
  __setRepoKeys("account-a", "repo-a", {
    actions: accountARepoAActionsKey,
    codespaces: accountARepoACodespacesKey,
    dependabot: accountARepoADependabotKey,
    environments: { "env-a": accountARepoAEnvAKey },
  });

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  provisionSecrets = createProvisioner(findProvisionerOctokit, encryptSecret);
});

it("handles secrets with no targets to provision to", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const missingTargetsResult = createTestProvisionAuthResult({
    isAllowed: false,
    results: [],
    isMissingTargets: true,
  });

  await provisionSecrets(tokenResults, [missingTargetsResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ No targets to provision to

    "
  `);
});

it("doesn't provision secrets when provisioning isn't allowed", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const notAllowedResult = createTestProvisionAuthResult({
    isAllowed: false,
    results: [
      createTestProvisionAuthTargetResult({
        isAllowed: false,
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });

  await provisionSecrets(tokenResults, [notAllowedResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Not allowed to provision to GitHub Actions secret in account-a

    "
  `);
});

it("doesn't provision secrets when the token wasn't created", async () => {
  const tokenAuthResultNotAllowed: TokenAuthResult = {
    ...tokenAuthResultA,
    request: {
      ...tokenAuthResultA.request,
      consumer: { account: "consumer-not-allowed" },
    },
  };
  const tokenAuthResultRequestError: TokenAuthResult = {
    ...tokenAuthResultA,
    request: {
      ...tokenAuthResultA.request,
      consumer: { account: "consumer-request-error" },
    },
  };
  const tokenAuthResultError: TokenAuthResult = {
    ...tokenAuthResultA,
    request: {
      ...tokenAuthResultA.request,
      consumer: { account: "consumer-error" },
    },
  };

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultNotAllowed, { type: "NOT_ALLOWED" }],
    [
      tokenAuthResultRequestError,
      { type: "REQUEST_ERROR", error: new TestRequestError(500) },
    ],
    [tokenAuthResultError, { type: "ERROR", error: new Error("boom") }],
  ]);

  const allowedResult = createTestProvisionAuthResult({
    results: [
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultNotAllowed,
      }),
      createTestProvisionAuthTargetResult({
        target: accountARepoAActionsTarget,
        tokenAuthResult: tokenAuthResultRequestError,
      }),
      createTestProvisionAuthTargetResult({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultError,
      }),
    ],
  });

  await provisionSecrets(tokenResults, [allowedResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Token wasn't created for GitHub Actions secret in account-a
      ❌ Token wasn't created for GitHub Actions secret in account-a/repo-a
      ❌ Token wasn't created for GitHub environment env-a secret in account-a/repo-a

    "
  `);
});

it("doesn't provision secrets when no suitable provisioners are found", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult = createTestProvisionAuthResult({
    results: [
      createTestProvisionAuthTargetResult({
        target: accountXActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });

  await provisionSecrets(tokenResults, [allowedResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ No suitable provisioner for GitHub Actions secret in account-x

    "
  `);
});

it("doesn't provision secrets when target provisioning fails with a GitHub API error", async () => {
  __setErrors("actions.createOrUpdateOrgSecret", [
    new TestRequestError(403, { message: "Resource not accessible" }),
  ]);

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult = createTestProvisionAuthResult({
    results: [
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });

  await provisionSecrets(tokenResults, [allowedResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: 403 - Forbidden
    ::debug::      {
    ::debug::        "message": "Resource not accessible"
    ::debug::      }

    "
  `);
});

it("doesn't provision secrets when target provisioning fails with an unexpected error", async () => {
  const error = new Error("<message>");
  error.stack = "Error: <message>\\n    at provisioner.ts:1:1";
  __setErrors("actions.createOrUpdateOrgSecret", [error]);

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult = createTestProvisionAuthResult({
    results: [
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });

  await provisionSecrets(tokenResults, [allowedResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: <message>
    ::debug::      Error: <message>\\n    at provisioner.ts:1:1

    "
  `);
});

it("doesn't provision secrets when encryption fails with a GitHub API error", async () => {
  __setOrgKeys("account-a", {});

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult = createTestProvisionAuthResult({
    results: [
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });

  await provisionSecrets(tokenResults, [allowedResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: 401 - Unauthorized
    ::debug::      (no response data)

    "
  `);
});

it("doesn't provision secrets when encryption fails with an unexpected error", async () => {
  const error = new Error("<message>");
  error.stack = "Error: <message>\n    at encrypt.ts:1:1";
  __setErrors("actions.getOrgPublicKey", [error]);

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult = createTestProvisionAuthResult({
    results: [
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });

  await provisionSecrets(tokenResults, [allowedResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: <message>
    ::debug::      Error: <message>
    ::debug::          at encrypt.ts:1:1

    "
  `);
});

it("can provision multiple secrets of the same type", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
    [tokenAuthResultB, tokenCreationResultCreatedB],
  ]);

  const allowedResultA = createTestProvisionAuthResult({
    results: [
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResult({
        target: accountARepoAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResult({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });
  const allowedResultB: ProvisionAuthResult = {
    request: createTestProvisionRequest({
      tokenDec: tokenDecB,
      secretDec: secretDecB,
      name: "SECRET_B",
      to: [
        accountAActionsTarget,
        accountARepoAActionsTarget,
        accountARepoAEnvATarget,
      ],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultB,
      }),
      createTestProvisionAuthTargetResult({
        target: accountARepoAActionsTarget,
        tokenAuthResult: tokenAuthResultB,
      }),
      createTestProvisionAuthTargetResult({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultB,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  await provisionSecrets(tokenResults, [allowedResultA, allowedResultB]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a
      ✅ Provisioned to GitHub Actions secret in account-a/repo-a
      ✅ Provisioned to GitHub environment env-a secret in account-a/repo-a

    Secret #2:

    ✅ Secret SECRET_B was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a
      ✅ Provisioned to GitHub Actions secret in account-a/repo-a
      ✅ Provisioned to GitHub environment env-a secret in account-a/repo-a

    "
  `);
  expect(__getOrgSecrets("account-a")).toEqual({
    actions: { SECRET_A: "<token-a>", SECRET_B: "<token-b>" },
    codespaces: {},
    dependabot: {},
  });
  expect(__getRepoSecrets("account-a", "repo-a")).toEqual({
    actions: { SECRET_A: "<token-a>", SECRET_B: "<token-b>" },
    codespaces: {},
    dependabot: {},
  });
  expect(__getEnvSecrets("account-a", "repo-a", "env-a")).toEqual({
    SECRET_A: "<token-a>",
    SECRET_B: "<token-b>",
  });
});

it("can provision a secret to multiple targets", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult = createTestProvisionAuthResult({
    results: [
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResult({
        target: accountACodespacesTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResult({
        target: accountADependabotTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResult({
        target: accountARepoAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResult({
        target: accountARepoACodespacesTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResult({
        target: accountARepoADependabotTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResult({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });

  await provisionSecrets(tokenResults, [allowedResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a
      ✅ Provisioned to GitHub Codespaces secret in account-a
      ✅ Provisioned to Dependabot secret in account-a
      ✅ Provisioned to GitHub Actions secret in account-a/repo-a
      ✅ Provisioned to GitHub Codespaces secret in account-a/repo-a
      ✅ Provisioned to Dependabot secret in account-a/repo-a
      ✅ Provisioned to GitHub environment env-a secret in account-a/repo-a

    "
  `);
  expect(__getOrgSecrets("account-a")).toEqual({
    actions: { SECRET_A: "<token-a>" },
    codespaces: { SECRET_A: "<token-a>" },
    dependabot: { SECRET_A: "<token-a>" },
  });
  expect(__getRepoSecrets("account-a", "repo-a")).toEqual({
    actions: { SECRET_A: "<token-a>" },
    codespaces: { SECRET_A: "<token-a>" },
    dependabot: { SECRET_A: "<token-a>" },
  });
  expect(__getEnvSecrets("account-a", "repo-a", "env-a")).toEqual({
    SECRET_A: "<token-a>",
  });
});

it("doesn't stop provisioning when some targets fail", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
    [tokenAuthResultB, tokenCreationResultNotCreated],
  ]);

  const notAllowedResult = createTestProvisionAuthResult({
    isAllowed: false,
    results: [
      createTestProvisionAuthTargetResult({
        isAllowed: false,
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });
  const allowedResult: ProvisionAuthResult = {
    request: createTestProvisionRequest({ secretDec: secretDecA }),
    results: [
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultB,
      }),
      createTestProvisionAuthTargetResult({
        target: accountXActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  await provisionSecrets(tokenResults, [notAllowedResult, allowedResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Not allowed to provision to GitHub Actions secret in account-a

    Secret #2:

    ❌ Secret SECRET_A was partially provisioned for repo account-a/repo-a:
      ❌ Token wasn't created for GitHub Actions secret in account-a
      ✅ Provisioned to GitHub Actions secret in account-a
      ❌ No suitable provisioner for GitHub Actions secret in account-x

    "
  `);
});

it("warns when no auth results are provided", async () => {
  const results = await provisionSecrets(new Map(), []);

  expect(results.size).toBe(0);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    ::warning::⚠️ No secrets were provisioned

    "
  `);
});
