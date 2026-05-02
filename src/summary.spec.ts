import { join } from "node:path";
import { expect, it } from "vitest";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../test/declaration.js";
import {
  createTestProvisionAuthResultAllowed,
  createTestProvisionAuthResultNotAllowed,
  createTestProvisionAuthTargetResultAllowed,
  createTestProvisionAuthTargetResultNotAllowed,
  createTestTokenAuthResultAllowed,
  createTestTokenAuthResultNotAllowed,
} from "../test/result.js";
import type { AuthorizeResult } from "./authorizer.js";
import type { ProvisionRequestTarget } from "./provision-request.js";
import { renderSummary } from "./summary.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { ProvisionResult } from "./type/provision-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

const fixturesPath = join(import.meta.dirname, "testdata/summary");
const githubServerUrl = "https://github.example.com";
const actionUrl = "https://github.example.com/test/action";

it("renders a summary with all secrets provisioned", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResultA = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const tokenAuthResultB = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "write" } }),
    },
    have: { contents: "write" },
    maxWant: "write",
  });

  const targetResultA = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultB = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultB,
  });

  const provisionAuthResultA = createTestProvisionAuthResultAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [targetResultA],
  });

  const provisionAuthResultB = createTestProvisionAuthResultAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultB.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-b",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_B",
      to: [accountAActionsTarget],
    },
    results: [targetResultB],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA, provisionAuthResultB],
    tokenResults: [tokenAuthResultA, tokenAuthResultB],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      {
        type: "CREATED",
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
    [
      tokenAuthResultB,
      {
        type: "CREATED",
        token: { token: "<token-b>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, { type: "PROVISIONED" }],
      ]),
    ],
    [
      provisionAuthResultB,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultB, { type: "PROVISIONED" }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "all-provisioned.md"));
});

it("renders a summary with some secrets denied", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResultA = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const tokenAuthResultB = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "write" } }),
    },
    have: { contents: "write" },
    maxWant: "write",
  });

  const targetResultA = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultB = createTestProvisionAuthTargetResultNotAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultB,
  });

  const provisionAuthResultA = createTestProvisionAuthResultAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [targetResultA],
  });

  const provisionAuthResultB = createTestProvisionAuthResultNotAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultB.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-b",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_B",
      to: [accountAActionsTarget],
    },
    results: [targetResultB],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA, provisionAuthResultB],
    tokenResults: [tokenAuthResultA, tokenAuthResultB],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      {
        type: "CREATED",
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
    [
      tokenAuthResultB,
      {
        type: "CREATED",
        token: { token: "<token-b>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, { type: "PROVISIONED" }],
      ]),
    ],
    [
      provisionAuthResultB,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultB, { type: "NOT_ALLOWED" }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "some-denied.md"));
});

it("renders a summary with all secrets denied", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResultA = createTestTokenAuthResultNotAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: {},
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResultNotAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
    isTokenAllowed: false,
  });

  const provisionAuthResultA = createTestProvisionAuthResultNotAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [targetResultA],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA],
    tokenResults: [tokenAuthResultA],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      {
        type: "CREATED",
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, { type: "NOT_ALLOWED" }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "all-denied.md"));
});

it("renders a summary with no secrets requested", async () => {
  const authResult: AuthorizeResult = {
    provisionResults: [],
    tokenResults: [],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>();

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >();

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "empty.md"));
});

it("renders a summary with environment targets", async () => {
  const accountARepoAEnvironmentTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "environment",
    target: { account: "account-a", repo: "repo-a", environment: "env-a" },
  };

  const tokenAuthResultA = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a", repo: "repo-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResultAllowed({
    target: accountARepoAEnvironmentTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const provisionAuthResultA = createTestProvisionAuthResultAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          repos: {
            "account-a/repo-a": { environments: ["env-a"] },
          },
        },
      }),
      name: "SECRET_A",
      to: [accountARepoAEnvironmentTarget],
    },
    results: [targetResultA],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA],
    tokenResults: [tokenAuthResultA],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      {
        type: "CREATED",
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, { type: "PROVISIONED" }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "environment-targets.md"));
});

it("renders a summary with multiple requesters", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResultA = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const tokenAuthResultB = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "write" } }),
    },
    have: { contents: "write" },
    maxWant: "write",
  });

  const targetResultA = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultB = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultB,
  });

  const provisionAuthResultA = createTestProvisionAuthResultAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [targetResultA],
  });

  const provisionAuthResultB = createTestProvisionAuthResultAllowed({
    request: {
      requester: { account: "account-y", repo: "repo-y" },
      tokenDec: tokenAuthResultB.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-b",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_B",
      to: [accountAActionsTarget],
    },
    results: [targetResultB],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA, provisionAuthResultB],
    tokenResults: [tokenAuthResultA, tokenAuthResultB],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      {
        type: "CREATED",
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
    [
      tokenAuthResultB,
      {
        type: "CREATED",
        token: { token: "<token-b>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, { type: "PROVISIONED" }],
      ]),
    ],
    [
      provisionAuthResultB,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultB, { type: "PROVISIONED" }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "multiple-requesters.md"));
});

it("renders a summary with a missing token declaration", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResultA = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultB = createTestProvisionAuthTargetResultNotAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: undefined,
    isTokenAllowed: false,
  });

  const provisionAuthResultA = createTestProvisionAuthResultAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [targetResultA],
  });

  const provisionAuthResultB = createTestProvisionAuthResultNotAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: undefined,
      tokenDecIsRegistered: false,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.missing-token",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_B",
      to: [accountAActionsTarget],
    },
    results: [targetResultB],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA, provisionAuthResultB],
    tokenResults: [tokenAuthResultA],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      {
        type: "CREATED",
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, { type: "PROVISIONED" }],
      ]),
    ],
    [
      provisionAuthResultB,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultB, { type: "NOT_ALLOWED" }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "missing-token-dec.md"));
});

it("renders a summary with an unshared token declaration", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResultA = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultB = createTestProvisionAuthTargetResultNotAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: undefined,
    isTokenAllowed: false,
  });

  const provisionAuthResultA = createTestProvisionAuthResultAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [targetResultA],
  });

  const provisionAuthResultB = createTestProvisionAuthResultNotAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: undefined,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.unshared-token",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_B",
      to: [accountAActionsTarget],
    },
    results: [targetResultB],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA, provisionAuthResultB],
    tokenResults: [tokenAuthResultA],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      {
        type: "CREATED",
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, { type: "PROVISIONED" }],
      ]),
    ],
    [
      provisionAuthResultB,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultB, { type: "NOT_ALLOWED" }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "unshared-token-dec.md"));
});

it("renders a summary with missing targets", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResultA = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const provisionAuthResultA = createTestProvisionAuthResultAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_A",
      to: [accountAActionsTarget],
    },
    results: [targetResultA],
  });

  const provisionAuthResultB = createTestProvisionAuthResultNotAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec({ permissions: { contents: "write" } }),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-b",
        github: {
          accounts: {},
        },
      }),
      name: "SECRET_B",
      to: [],
    },
    results: [],
    isMissingTargets: true,
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA, provisionAuthResultB],
    tokenResults: [tokenAuthResultA],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      {
        type: "CREATED",
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, { type: "PROVISIONED" }],
      ]),
    ],
    [
      provisionAuthResultB,
      new Map<ProvisionAuthTargetResult, ProvisionResult>(),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "missing-targets.md"));
});

it("renders a summary with multiple distinct targets", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const accountACodespacesTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "codespaces",
    target: { account: "account-a" },
  };

  const accountBActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-b" },
  };

  const tokenAuthResultA = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultB = createTestProvisionAuthTargetResultAllowed({
    target: accountBActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultA2 = createTestProvisionAuthTargetResultAllowed({
    target: accountACodespacesTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const provisionAuthResultA = createTestProvisionAuthResultAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true },
            "account-b": { actions: true },
          },
        },
      }),
      name: "SECRET_A",
      to: [
        accountAActionsTarget,
        accountACodespacesTarget,
        accountBActionsTarget,
      ],
    },
    results: [targetResultA, targetResultA2, targetResultB],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA],
    tokenResults: [tokenAuthResultA],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      {
        type: "CREATED",
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, { type: "PROVISIONED" }],
        [targetResultA2, { type: "PROVISIONED" }],
        [targetResultB, { type: "PROVISIONED" }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "multiple-targets.md"));
});

it("truncates rows beyond the limit and shows a notice", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const provisionAuthResults: ProvisionAuthResult[] = [];
  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >();

  for (let i = 0; i < 1002; ++i) {
    const provisionAuthResult = createTestProvisionAuthResultNotAllowed({
      request: {
        requester: { account: "account-x", repo: "repo-x" },
        tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
        tokenDecIsRegistered: true,
        secretDec: createTestSecretDec({
          token: "account-a/repo-a.token-a",
          github: {
            accounts: {
              "account-a": { actions: true },
            },
          },
        }),
        name: `SECRET_${i.toString().padStart(4, "0")}`,
        to: [accountAActionsTarget],
      },
      results: [],
      isMissingTargets: true,
    });

    provisionAuthResults.push(provisionAuthResult);
    provisionResults.set(
      provisionAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>(),
    );
  }

  const authResult: AuthorizeResult = {
    provisionResults: provisionAuthResults,
    tokenResults: [],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>();

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "row-limit.md"));
});

it("renders a failure reason when tokens aren't allowed", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResult = createTestTokenAuthResultNotAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResultNotAllowed({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResult,
    isTokenAllowed: false,
  });

  const provisionAuthResult = createTestProvisionAuthResultNotAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-not-allowed",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_TOKEN_NOT_ALLOWED",
      to: [accountAActionsTarget],
    },
    results: [targetResult],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResult],
    tokenResults: [tokenAuthResult],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>();

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResult, { type: "NOT_ALLOWED" }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "token-not-allowed.md"));
});

it("renders a failure reason when no suitable issuer is found", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResult = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResultNotAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.no-issuer",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_NO_ISSUER",
      to: [accountAActionsTarget],
    },
    results: [targetResult],
    isAllowed: true,
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResult],
    tokenResults: [tokenAuthResult],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResult, { type: "NO_ISSUER" }],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResult, { type: "NO_TOKEN" }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "no-suitable-issuer.md"));
});

it("renders a failure reason when token issuance fails", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResult = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { issues: "read" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResultNotAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.issue-error",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_ISSUE_ERROR",
      to: [accountAActionsTarget],
    },
    results: [targetResult],
    isAllowed: true,
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResult],
    tokenResults: [tokenAuthResult],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResult, { type: "ERROR", error: new Error("boom") }],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResult, { type: "NO_TOKEN" }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "token-issuance-failed.md"));
});

it("renders a failure reason when no suitable provisioner is found", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResult = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { actions: "read" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResultNotAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.no-provisioner",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_NO_PROVISIONER",
      to: [accountAActionsTarget],
    },
    results: [targetResult],
    isAllowed: true,
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResult],
    tokenResults: [tokenAuthResult],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResult,
      {
        type: "CREATED",
        token: {
          token: "<token-no-provisioner>",
          expires_at: "2001-02-03T04:05:06Z",
        },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResult, { type: "NO_PROVISIONER" }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "no-suitable-provisioner.md"));
});

it("renders a failure reason when provisioning has no target results", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResult = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { checks: "read" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResultNotAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.failed-provision-empty",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_FAILED_PROVISION_EMPTY",
      to: [accountAActionsTarget],
    },
    results: [targetResult],
    isAllowed: true,
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResult],
    tokenResults: [tokenAuthResult],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResult,
      {
        type: "CREATED",
        token: {
          token: "<token-failed-provision-empty>",
          expires_at: "2001-02-03T04:05:06Z",
        },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>(),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(
    join(fixturesPath, "provisioning-no-target-results.md"),
  );
});

it("renders a failure reason when provisioning partially fails across targets", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const accountBActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-b" },
  };

  const tokenAuthResult = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { deployments: "read" } }),
    },
  });

  const targetResultA = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const targetResultB = createTestProvisionAuthTargetResultAllowed({
    target: accountBActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResultNotAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.partial-failure",
        github: {
          accounts: {
            "account-a": { actions: true },
            "account-b": { actions: true },
          },
        },
      }),
      name: "SECRET_PARTIAL_FAILURE",
      to: [accountAActionsTarget, accountBActionsTarget],
    },
    results: [targetResultA, targetResultB],
    isAllowed: true,
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResult],
    tokenResults: [tokenAuthResult],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResult,
      {
        type: "CREATED",
        token: {
          token: "<token-partial-failure>",
          expires_at: "2001-02-03T04:05:06Z",
        },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, { type: "PROVISIONED" }],
        [targetResultB, { type: "ERROR", error: new Error("boom") }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "provisioning-partial-failure.md"));
});

it("renders a failure reason when provisioning fails for all targets", async () => {
  const accountAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const tokenAuthResult = createTestTokenAuthResultAllowed({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { statuses: "read" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResultAllowed({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResultNotAllowed({
    request: {
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.failed-provision",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      name: "SECRET_FAILED_PROVISION",
      to: [accountAActionsTarget],
    },
    results: [targetResult],
    isAllowed: true,
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResult],
    tokenResults: [tokenAuthResult],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResult,
      {
        type: "CREATED",
        token: {
          token: "<token-failed-provision>",
          expires_at: "2001-02-03T04:05:06Z",
        },
      },
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResult, { type: "ERROR", error: new Error("boom") }],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(
    join(fixturesPath, "provisioning-all-targets-failed.md"),
  );
});
