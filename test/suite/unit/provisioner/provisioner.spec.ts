import { beforeEach, expect, it, vi, type Mock } from "vitest";
import { __reset as __resetCore } from "../../../../__mocks__/@actions/core.js";
import {
  __getEnvSecrets,
  __getOrgSecrets,
  __getRepoSecrets,
  __reset as __resetOctokit,
  __setApps,
  __setEnvironments,
  __setErrors,
  __setInstallations,
  __setOrgKeys,
  __setRepoKeys,
  TestRequestError,
} from "../../../../__mocks__/@octokit/action.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../../src/app-registry.js";
import {
  createEncryptSecret,
  type EncryptSecret,
} from "../../../../src/encrypt-secret.js";
import { createOctokitFactory } from "../../../../src/octokit.js";
import type { ProvisionRequestTarget } from "../../../../src/provision-request.js";
import { createFindProvisionerOctokit } from "../../../../src/provisioner-octokit.js";
import {
  createProvisioner,
  type Provisioner,
} from "../../../../src/provisioner.js";
import type { TokenCreationResult } from "../../../../src/token-factory.js";
import type { ProvisionAuthResult } from "../../../../src/type/provision-auth-result.js";
import type { TokenAuthResult } from "../../../../src/type/token-auth-result.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../../../declaration.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
  createTestRepoEnvironment,
} from "../../../github-api.js";
import { createTestKeyPair } from "../../../key.js";
import {
  createTestProvisionAuthTargetResultAllowed,
  createTestProvisionAuthTargetResultNotAllowed,
  provisionResultsToArray,
} from "../../../result.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

const accountA = createTestInstallationAccount(
  "Organization",
  100,
  "account-a",
);
const repoA = createTestInstallationRepo(accountA, "repo-a");
const envA = createTestRepoEnvironment("env-a");
const appA = createTestApp(110, "app-a", "App A");
const appRegA: AppRegistration = {
  app: appA,
  issuer: { enabled: false, roles: [] },
  provisioner: { enabled: true },
};
const appAInstallationA = createTestInstallation(
  111,
  appA,
  accountA,
  "selected",
);
const appAInstallationRegA: InstallationRegistration = {
  installation: appAInstallationA,
  repos: [repoA],
};

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

const tokenDecA = createTestTokenDec({ permissions: { metadata: "read" } });
const tokenDecB = createTestTokenDec({ permissions: { contents: "write" } });

const secretDecA = createTestSecretDec({
  github: { accounts: { "account-a": { actions: true } } },
});
const secretDecB = createTestSecretDec({
  github: { repos: { "account-a/repo-a": { codespaces: true } } },
});

const tokenAuthResultA: TokenAuthResult = {
  type: "ALL_REPOS",
  have: { metadata: "read" },
  isAllowed: true,
  isMissingRole: false,
  isSufficient: true,
  maxWant: "read",
  request: {
    consumer: { account: "account-a" },
    repos: "all",
    tokenDec: tokenDecA,
  },
  rules: [],
};
const tokenAuthResultB: TokenAuthResult = {
  type: "ALL_REPOS",
  have: { metadata: "read" },
  isAllowed: true,
  isMissingRole: false,
  isSufficient: true,
  maxWant: "read",
  request: {
    consumer: { account: "account-a" },
    repos: "all",
    tokenDec: tokenDecA,
  },
  rules: [],
};

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

const accountAActionsTarget: ProvisionRequestTarget = {
  platform: "github",
  type: "actions",
  target: { account: "account-a" },
};
const accountARepoAActionsTarget: ProvisionRequestTarget = {
  platform: "github",
  type: "actions",
  target: { account: "account-a", repo: "repo-a" },
};

const accountACodespacesTarget: ProvisionRequestTarget = {
  platform: "github",
  type: "codespaces",
  target: { account: "account-a" },
};
const accountARepoACodespacesTarget: ProvisionRequestTarget = {
  platform: "github",
  type: "codespaces",
  target: { account: "account-a", repo: "repo-a" },
};

const accountADependabotTarget: ProvisionRequestTarget = {
  platform: "github",
  type: "dependabot",
  target: { account: "account-a" },
};
const accountARepoADependabotTarget: ProvisionRequestTarget = {
  platform: "github",
  type: "dependabot",
  target: { account: "account-a", repo: "repo-a" },
};

const accountARepoAEnvATarget: ProvisionRequestTarget = {
  platform: "github",
  type: "environment",
  target: { account: "account-a", repo: "repo-a", environment: "env-a" },
};

const accountXActionsTarget: ProvisionRequestTarget = {
  platform: "github",
  type: "actions",
  target: { account: "account-x" },
};

let encryptSecret: Mock<EncryptSecret>;
let provisionSecrets: Provisioner;

beforeEach(async () => {
  __resetCore();
  __resetOctokit();

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA]]]);
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

  const octokitFactory = createOctokitFactory();

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const findProvisionerOctokit = createFindProvisionerOctokit(
    octokitFactory,
    appRegistry,
    [
      {
        appId: appA.id,
        privateKey: appA.privateKey,
        issuer: appRegA.issuer,
        provisioner: appRegA.provisioner,
      },
    ],
  );

  encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  provisionSecrets = createProvisioner(findProvisionerOctokit, encryptSecret);
});

it("doesn't provision secrets when provisioning is not allowed", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const notAllowedResult: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: secretDecA,
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [
      createTestProvisionAuthTargetResultNotAllowed({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: false,
  };

  expect(
    provisionResultsToArray(
      await provisionSecrets(tokenResults, [notAllowedResult]),
    ),
  ).toEqual([
    [
      notAllowedResult,
      [[notAllowedResult.results[0], { type: "NOT_ALLOWED" }]],
    ],
  ]);
});

it("doesn't provision secrets when the token wasn't created", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultB, tokenCreationResultNotCreated],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: secretDecA,
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [
      createTestProvisionAuthTargetResultAllowed({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultB,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  expect(
    provisionResultsToArray(
      await provisionSecrets(tokenResults, [allowedResult]),
    ),
  ).toEqual([
    [allowedResult, [[allowedResult.results[0], { type: "NO_TOKEN" }]]],
  ]);
});

it("doesn't provision secrets when no suitable provisioners are found", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: secretDecA,
      name: "SECRET_A",
      to: [accountXActionsTarget],
    },
    results: [
      createTestProvisionAuthTargetResultAllowed({
        target: accountXActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  expect(
    provisionResultsToArray(
      await provisionSecrets(tokenResults, [allowedResult]),
    ),
  ).toEqual([
    [allowedResult, [[allowedResult.results[0], { type: "NO_PROVISIONER" }]]],
  ]);
});

it("doesn't provision secrets when encryption fails with a GitHub API error", async () => {
  __setOrgKeys("account-a", {});

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: secretDecA,
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [
      createTestProvisionAuthTargetResultAllowed({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  expect(
    provisionResultsToArray(
      await provisionSecrets(tokenResults, [allowedResult]),
    ),
  ).toEqual([
    [
      allowedResult,
      [
        [
          allowedResult.results[0],
          { type: "REQUEST_ERROR", error: new TestRequestError(401) },
        ],
      ],
    ],
  ]);
});

it("doesn't provision secrets when encryption fails with an unexpected error", async () => {
  __setErrors("actions.getOrgPublicKey", [new Error("<message>")]);

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: secretDecA,
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [
      createTestProvisionAuthTargetResultAllowed({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  expect(
    provisionResultsToArray(
      await provisionSecrets(tokenResults, [allowedResult]),
    ),
  ).toEqual([
    [
      allowedResult,
      [
        [
          allowedResult.results[0],
          { type: "ERROR", error: new Error("<message>") },
        ],
      ],
    ],
  ]);
});

it("can provision multiple secrets of the same type", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
    [tokenAuthResultB, tokenCreationResultCreatedB],
  ]);

  const allowedResultA: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: secretDecA,
      name: "SECRET_A",
      to: [
        accountAActionsTarget,
        accountARepoAActionsTarget,
        accountARepoAEnvATarget,
      ],
    },
    results: [
      createTestProvisionAuthTargetResultAllowed({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResultAllowed({
        target: accountARepoAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResultAllowed({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };
  const allowedResultB: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecB,
      tokenDecIsRegistered: true,
      secretDec: secretDecB,
      name: "SECRET_B",
      to: [
        accountAActionsTarget,
        accountARepoAActionsTarget,
        accountARepoAEnvATarget,
      ],
    },
    results: [
      createTestProvisionAuthTargetResultAllowed({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultB,
      }),
      createTestProvisionAuthTargetResultAllowed({
        target: accountARepoAActionsTarget,
        tokenAuthResult: tokenAuthResultB,
      }),
      createTestProvisionAuthTargetResultAllowed({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultB,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  expect(
    provisionResultsToArray(
      await provisionSecrets(tokenResults, [allowedResultA, allowedResultB]),
    ),
  ).toEqual([
    [
      allowedResultA,
      [
        [allowedResultA.results[0], { type: "PROVISIONED" }],
        [allowedResultA.results[1], { type: "PROVISIONED" }],
        [allowedResultA.results[2], { type: "PROVISIONED" }],
      ],
    ],
    [
      allowedResultB,
      [
        [allowedResultB.results[0], { type: "PROVISIONED" }],
        [allowedResultB.results[1], { type: "PROVISIONED" }],
        [allowedResultB.results[2], { type: "PROVISIONED" }],
      ],
    ],
  ]);
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

  const allowedResult: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: secretDecA,
      name: "SECRET_A",
      to: [
        accountAActionsTarget,
        accountACodespacesTarget,
        accountADependabotTarget,
        accountARepoAActionsTarget,
        accountARepoACodespacesTarget,
        accountARepoADependabotTarget,
        accountARepoAEnvATarget,
      ],
    },
    results: [
      createTestProvisionAuthTargetResultAllowed({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResultAllowed({
        target: accountACodespacesTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResultAllowed({
        target: accountADependabotTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResultAllowed({
        target: accountARepoAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResultAllowed({
        target: accountARepoACodespacesTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResultAllowed({
        target: accountARepoADependabotTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResultAllowed({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  expect(
    provisionResultsToArray(
      await provisionSecrets(tokenResults, [allowedResult]),
    ),
  ).toEqual([
    [
      allowedResult,
      [
        [allowedResult.results[0], { type: "PROVISIONED" }],
        [allowedResult.results[1], { type: "PROVISIONED" }],
        [allowedResult.results[2], { type: "PROVISIONED" }],
        [allowedResult.results[3], { type: "PROVISIONED" }],
        [allowedResult.results[4], { type: "PROVISIONED" }],
        [allowedResult.results[5], { type: "PROVISIONED" }],
        [allowedResult.results[6], { type: "PROVISIONED" }],
      ],
    ],
  ]);
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

  const notAllowedResult: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: secretDecA,
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [
      createTestProvisionAuthTargetResultNotAllowed({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: false,
  };
  const allowedResult: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: secretDecA,
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [
      createTestProvisionAuthTargetResultAllowed({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultB,
      }),
      createTestProvisionAuthTargetResultAllowed({
        target: accountXActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
      createTestProvisionAuthTargetResultAllowed({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  expect(
    provisionResultsToArray(
      await provisionSecrets(tokenResults, [notAllowedResult, allowedResult]),
    ),
  ).toEqual([
    [
      notAllowedResult,
      [[notAllowedResult.results[0], { type: "NOT_ALLOWED" }]],
    ],
    [
      allowedResult,
      [
        [allowedResult.results[0], { type: "NO_TOKEN" }],
        [allowedResult.results[1], { type: "NO_PROVISIONER" }],
        [allowedResult.results[2], { type: "PROVISIONED" }],
      ],
    ],
  ]);
});
