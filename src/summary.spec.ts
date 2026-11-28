import { join } from "node:path";
import { expect, it } from "vitest";
import { TestRequestError } from "../__mocks__/@octokit/action.js";
import { testContext } from "../test/context.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../test/declaration.js";
import { createTestInstallationRegistration } from "../test/github-api.js";
import {
  createTestAccountProvisionRequestTarget,
  createTestEnvironmentProvisionRequestTarget,
  createTestProvisionRequest,
} from "../test/provision-request.js";
import {
  createTestProvisionAuthResult,
  createTestProvisionAuthTargetResult,
  createTestProvisionFailedResult,
  createTestProvisionedResult,
  createTestTokenAuthResult,
  createTestTokenCreationCreatedResult,
  createTestTokenCreationFailedResult,
} from "../test/result.js";
import type { AuthorizeResult } from "./authorizer.js";
import { ValidateError } from "./config/validation.js";
import { ParseYamlError } from "./config/yaml.js";
import type { DiscoveredRequester } from "./discover-requesters.js";
import { createRepoRef } from "./github-reference.js";
import { renderSummary } from "./summary.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { ProvisionResult } from "./type/provision-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

const fixturesPath = join(import.meta.dirname, "testdata/summary");

it("renders a summary with config issues", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const targetResult = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-w", repo: "repo-w" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      to: [accountAActionsTarget],
    }),
    results: [targetResult],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResult],
    tokenResults: [tokenAuthResult],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResult, createTestProvisionedResult()],
      ]),
    ],
  ]);

  const requesters: DiscoveredRequester[] = [
    {
      requester: createRepoRef("account-v", "repo-v"),
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "5555555555555555555555555555555555555555",
      config: {
        $schema: "",
        dashboard: { enabled: true },
        tokens: {},
        provision: { secrets: {} },
      },
    },
    {
      requester: createRepoRef("account-z", "repo-z"),
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "3333333333333333333333333333333333333333",
      configError: new Error("Something unexpected happened"),
    },
    {
      requester: createRepoRef("account-x", "repo-x"),
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "1111111111111111111111111111111111111111",
      configError: new ValidateError("Invalid requester configuration", [
        {
          instancePath: "/tokens/token-a/shared",
          schemaPath: "#/properties/tokens/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: "shared" },
          message: "must NOT have additional properties",
        },
      ]),
    },
    {
      requester: createRepoRef("account-y", "repo-y"),
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "2222222222222222222222222222222222222222",
      configError: new ParseYamlError(
        new Error("Bad indentation"),
        [],
        "account-y/repo-y/.github/ghalactic/provision-github-tokens.yml",
      ),
    },
  ];

  await expect(
    renderSummary(
      testContext,
      requesters,
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "config-issues.md"));
});

it("renders a summary with only config issues", async () => {
  const authResult: AuthorizeResult = {
    provisionResults: [],
    tokenResults: [],
  };

  const requesters: DiscoveredRequester[] = [
    {
      requester: createRepoRef("account-x", "repo-x"),
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "1111111111111111111111111111111111111111",
      configError: new ParseYamlError(
        new Error("Bad indentation"),
        [],
        "account-x/repo-x/.github/ghalactic/provision-github-tokens.yml",
      ),
    },
  ];

  await expect(
    renderSummary(
      testContext,
      requesters,
      authResult,
      new Map<TokenAuthResult, TokenCreationResult>(),
      new Map<
        ProvisionAuthResult,
        Map<ProvisionAuthTargetResult, ProvisionResult>
      >(),
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "config-issues-only.md"));
});

it("truncates config issues beyond the limit and shows notices", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const provisionAuthResult = createTestProvisionAuthResult({
    isAllowed: false,
    request: createTestProvisionRequest({
      requester: { account: "account-w", repo: "repo-w" },
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      to: [accountAActionsTarget],
    }),
    results: [],
    isMissingTargets: true,
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResult],
    tokenResults: [],
  };

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>(),
    ],
  ]);

  const requesters: DiscoveredRequester[] = [];

  for (let i = 0; i < 1002; ++i) {
    const repo = `repo-${i.toString().padStart(4, "0")}`;

    requesters.push({
      requester: createRepoRef("account-x", repo),
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: i.toString(16).padStart(40, "0"),
      configError: new ValidateError("Invalid requester configuration", []),
    });
  }

  await expect(
    renderSummary(
      testContext,
      requesters,
      authResult,
      new Map<TokenAuthResult, TokenCreationResult>(),
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "config-issues-row-limit.md"));
});

it("renders a summary with all secrets provisioned", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({
        as: "role-a",
        permissions: { contents: "write" },
      }),
    },
    have: { contents: "write" },
    maxWant: "write",
  });

  const targetResultA = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultB = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultB,
  });

  const provisionAuthResultA = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      to: [accountAActionsTarget],
    }),
    results: [targetResultA],
  });

  const provisionAuthResultB = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultB.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-b",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_B",
      to: [accountAActionsTarget],
    }),
    results: [targetResultB],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA, provisionAuthResultB],
    tokenResults: [tokenAuthResultA, tokenAuthResultB],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
    [
      tokenAuthResultB,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-b>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, createTestProvisionedResult()],
      ]),
    ],
    [
      provisionAuthResultB,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultB, createTestProvisionedResult()],
      ]),
    ],
  ]);

  const summary = renderSummary(
    testContext,
    [],
    authResult,
    tokenCreationResults,
    provisionResults,
  );

  expect(summary).not.toContain("[^fallback]");
  await expect(summary).toMatchFileSnapshot(
    join(fixturesPath, "all-provisioned.md"),
  );
});

it("renders a summary with some secrets denied", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({
        as: "role-a",
        permissions: { contents: "write" },
      }),
    },
    have: { contents: "write" },
    maxWant: "write",
  });

  const targetResultA = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultB = createTestProvisionAuthTargetResult({
    isAllowed: false,
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultB,
  });

  const provisionAuthResultA = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      to: [accountAActionsTarget],
    }),
    results: [targetResultA],
  });

  const provisionAuthResultB = createTestProvisionAuthResult({
    isAllowed: false,
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultB.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-b",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_B",
      to: [accountAActionsTarget],
    }),
    results: [targetResultB],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA, provisionAuthResultB],
    tokenResults: [tokenAuthResultA, tokenAuthResultB],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
    [
      tokenAuthResultB,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-b>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, createTestProvisionedResult()],
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
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "some-denied.md"));
});

it("renders a summary with all secrets denied", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResultA = createTestTokenAuthResult({
    isAllowed: false,
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: {},
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResult({
    isAllowed: false,
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
    isTokenAllowed: false,
  });

  const provisionAuthResultA = createTestProvisionAuthResult({
    isAllowed: false,
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      to: [accountAActionsTarget],
    }),
    results: [targetResultA],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA],
    tokenResults: [tokenAuthResultA],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
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
      testContext,
      [],
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
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "empty.md"));
});

it("renders a summary with environment targets", async () => {
  const accountARepoAEnvironmentTarget =
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-a",
      "private",
    );

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a", repo: "repo-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResult({
    target: accountARepoAEnvironmentTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const provisionAuthResultA = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: { repos: { "account-a/repo-a": { environments: ["env-a"] } } },
      }),
      to: [accountARepoAEnvironmentTarget],
    }),
    results: [targetResultA],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA],
    tokenResults: [tokenAuthResultA],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, createTestProvisionedResult()],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "environment-targets.md"));
});

it("renders a summary with multiple requesters", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({
        as: "role-a",
        permissions: { contents: "write" },
      }),
    },
    have: { contents: "write" },
    maxWant: "write",
  });

  const targetResultA = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultB = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultB,
  });

  const provisionAuthResultA = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      to: [accountAActionsTarget],
    }),
    results: [targetResultA],
  });

  const provisionAuthResultB = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-y", repo: "repo-y" },
      tokenDec: tokenAuthResultB.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-b",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_B",
      to: [accountAActionsTarget],
    }),
    results: [targetResultB],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA, provisionAuthResultB],
    tokenResults: [tokenAuthResultA, tokenAuthResultB],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
    [
      tokenAuthResultB,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-b>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, createTestProvisionedResult()],
      ]),
    ],
    [
      provisionAuthResultB,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultB, createTestProvisionedResult()],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "multiple-requesters.md"));
});

it("renders a summary with a missing token declaration", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultB = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    isAllowed: false,
    tokenAuthResult: undefined,
    isTokenAllowed: false,
  });

  const provisionAuthResultA = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      to: [accountAActionsTarget],
    }),
    results: [targetResultA],
  });

  const provisionAuthResultB = createTestProvisionAuthResult({
    isAllowed: false,
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: undefined,
      tokenDecIsRegistered: false,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.missing-token",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_B",
      to: [accountAActionsTarget],
    }),
    results: [targetResultB],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA, provisionAuthResultB],
    tokenResults: [tokenAuthResultA],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, createTestProvisionedResult()],
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
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "missing-token-dec.md"));
});

it("renders a summary with an unshared token declaration", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultB = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    isAllowed: false,
    tokenAuthResult: undefined,
    isTokenAllowed: false,
  });

  const provisionAuthResultA = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      to: [accountAActionsTarget],
    }),
    results: [targetResultA],
  });

  const provisionAuthResultB = createTestProvisionAuthResult({
    isAllowed: false,
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: undefined,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.unshared-token",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_B",
      to: [accountAActionsTarget],
    }),
    results: [targetResultB],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA, provisionAuthResultB],
    tokenResults: [tokenAuthResultA],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, createTestProvisionedResult()],
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
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "unshared-token-dec.md"));
});

it("renders a summary with missing targets", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const provisionAuthResultA = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      to: [accountAActionsTarget],
    }),
    results: [targetResultA],
  });

  const provisionAuthResultB = createTestProvisionAuthResult({
    isAllowed: false,
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec({ permissions: { contents: "write" } }),
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-b",
        github: {},
      }),
      name: "SECRET_B",
      to: [],
    }),
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
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, createTestProvisionedResult()],
      ]),
    ],
    [
      provisionAuthResultB,
      new Map<ProvisionAuthTargetResult, ProvisionResult>(),
    ],
  ]);

  await expect(
    renderSummary(
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "missing-targets.md"));
});

it("renders a summary with multiple distinct targets", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const accountAAgentsTarget = createTestAccountProvisionRequestTarget(
    "agents",
    "account-a",
    "private",
  );

  const accountACodespacesTarget = createTestAccountProvisionRequestTarget(
    "codespaces",
    "account-a",
    "private",
  );

  const accountBActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-b",
    "private",
  );

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultB = createTestProvisionAuthTargetResult({
    target: accountBActionsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultA2 = createTestProvisionAuthTargetResult({
    target: accountAAgentsTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const targetResultA3 = createTestProvisionAuthTargetResult({
    target: accountACodespacesTarget,
    tokenAuthResult: tokenAuthResultA,
  });

  const provisionAuthResultA = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResultA.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": {
              actions: "private",
              agents: "private",
              codespaces: "private",
            },
            "account-b": { actions: "private" },
          },
        },
      }),
      to: [
        accountAActionsTarget,
        accountAAgentsTarget,
        accountACodespacesTarget,
        accountBActionsTarget,
      ],
    }),
    results: [targetResultA, targetResultA2, targetResultA3, targetResultB],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [provisionAuthResultA],
    tokenResults: [tokenAuthResultA],
  };

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResultA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, createTestProvisionedResult()],
        [targetResultA2, createTestProvisionedResult()],
        [targetResultA3, createTestProvisionedResult()],
        [targetResultB, createTestProvisionedResult()],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "multiple-targets.md"));
});

it("truncates rows beyond the limit and shows a notice", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const provisionAuthResults: ProvisionAuthResult[] = [];
  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >();

  for (let i = 0; i < 1002; ++i) {
    const provisionAuthResult = createTestProvisionAuthResult({
      isAllowed: false,
      request: createTestProvisionRequest({
        requester: { account: "account-x", repo: "repo-x" },
        tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
        secretDec: createTestSecretDec({
          token: "account-a/repo-a.token-a",
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
        name: `SECRET_${i.toString().padStart(4, "0")}`,
        to: [accountAActionsTarget],
      }),
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
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "row-limit.md"));
});

it("renders a failure reason when tokens aren't allowed", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResult = createTestTokenAuthResult({
    isAllowed: false,
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResult({
    isAllowed: false,
    target: accountAActionsTarget,
    tokenAuthResult: tokenAuthResult,
    isTokenAllowed: false,
  });

  const provisionAuthResult = createTestProvisionAuthResult({
    isAllowed: false,
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-not-allowed",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_TOKEN_NOT_ALLOWED",
      to: [accountAActionsTarget],
    }),
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
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "token-not-allowed.md"));
});

it("renders a failure reason when no suitable issuer is found", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.no-issuer",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_NO_ISSUER",
      to: [accountAActionsTarget],
    }),
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
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "no-suitable-issuer.md"));
});

it("renders a failure reason when token issuance fails", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { issues: "read" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.issue-error",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_ISSUE_ERROR",
      to: [accountAActionsTarget],
    }),
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
      createTestTokenCreationFailedResult([
        {
          type: "ERROR",
          issuer: createTestInstallationRegistration(),
          error: new Error("boom"),
        },
      ]),
    ],
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
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "token-issuance-failed.md"));
});

it("renders a failure reason when no suitable provisioner is found", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { actions: "read" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.no-provisioner",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_NO_PROVISIONER",
      to: [accountAActionsTarget],
    }),
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
      createTestTokenCreationCreatedResult({
        token: {
          token: "<token-no-provisioner>",
          expires_at: "2001-02-03T04:05:06Z",
        },
      }),
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
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "no-suitable-provisioner.md"));
});

it("renders a failure reason when provisioning has no target results", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { checks: "read" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.failed-provision-empty",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_FAILED_PROVISION_EMPTY",
      to: [accountAActionsTarget],
    }),
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
      createTestTokenCreationCreatedResult({
        token: {
          token: "<token-failed-provision-empty>",
          expires_at: "2001-02-03T04:05:06Z",
        },
      }),
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
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(
    join(fixturesPath, "provisioning-no-target-results.md"),
  );
});

it("renders a failure reason when provisioning partially fails across targets", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const accountBActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-b",
    "private",
  );

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { deployments: "read" } }),
    },
  });

  const targetResultA = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const targetResultB = createTestProvisionAuthTargetResult({
    target: accountBActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.partial-failure",
        github: {
          accounts: {
            "account-a": { actions: "private" },
            "account-b": { actions: "private" },
          },
        },
      }),
      name: "SECRET_PARTIAL_FAILURE",
      to: [accountAActionsTarget, accountBActionsTarget],
    }),
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
      createTestTokenCreationCreatedResult({
        token: {
          token: "<token-partial-failure>",
          expires_at: "2001-02-03T04:05:06Z",
        },
      }),
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, createTestProvisionedResult()],
        [
          targetResultB,
          createTestProvisionFailedResult([
            {
              type: "ERROR",
              provisioner: createTestInstallationRegistration(),
              error: new Error("boom"),
            },
          ]),
        ],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "provisioning-partial-failure.md"));
});

it("renders a failure reason when provisioning fails for all targets", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { statuses: "read" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const provisionAuthResult = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.failed-provision",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_FAILED_PROVISION",
      to: [accountAActionsTarget],
    }),
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
      createTestTokenCreationCreatedResult({
        token: {
          token: "<token-failed-provision>",
          expires_at: "2001-02-03T04:05:06Z",
        },
      }),
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      provisionAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [
          targetResult,
          createTestProvisionFailedResult([
            {
              type: "ERROR",
              provisioner: createTestInstallationRegistration(),
              error: new Error("boom"),
            },
          ]),
        ],
      ]),
    ],
  ]);

  await expect(
    renderSummary(
      testContext,
      [],
      authResult,
      tokenCreationResults,
      provisionResults,
    ),
  ).toMatchFileSnapshot(
    join(fixturesPath, "provisioning-all-targets-failed.md"),
  );
});

it("warns and adds a footnote when a fallback was used", async () => {
  const accountAActionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  const issuerFallbackToken = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
    },
    have: { metadata: "read" },
    maxWant: "read",
  });

  const provisionerFallbackToken = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
    },
    have: { contents: "read" },
    maxWant: "read",
  });

  const bothFallbackToken = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { actions: "read" } }),
    },
    have: { actions: "read" },
    maxWant: "read",
  });

  const noFallbackToken = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { issues: "read" } }),
    },
    have: { issues: "read" },
    maxWant: "read",
  });

  const issuerFallbackTarget = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: issuerFallbackToken,
  });

  const provisionerFallbackTarget = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: provisionerFallbackToken,
  });

  const bothFallbackTarget = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: bothFallbackToken,
  });

  const noFallbackTarget = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult: noFallbackToken,
  });

  const issuerFallbackAuthResult = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: issuerFallbackToken.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_ISSUER_FALLBACK",
      to: [accountAActionsTarget],
    }),
    results: [issuerFallbackTarget],
  });

  const provisionerFallbackAuthResult = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: provisionerFallbackToken.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-b",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_PROVISIONER_FALLBACK",
      to: [accountAActionsTarget],
    }),
    results: [provisionerFallbackTarget],
  });

  const bothFallbackAuthResult = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: bothFallbackToken.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-c",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_BOTH_FALLBACK",
      to: [accountAActionsTarget],
    }),
    results: [bothFallbackTarget],
  });

  const noFallbackAuthResult = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: noFallbackToken.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-d",
        github: { accounts: { "account-a": { actions: "private" } } },
      }),
      name: "SECRET_NO_FALLBACK",
      to: [accountAActionsTarget],
    }),
    results: [noFallbackTarget],
  });

  const authResult: AuthorizeResult = {
    provisionResults: [
      issuerFallbackAuthResult,
      provisionerFallbackAuthResult,
      bothFallbackAuthResult,
      noFallbackAuthResult,
    ],
    tokenResults: [
      issuerFallbackToken,
      provisionerFallbackToken,
      bothFallbackToken,
      noFallbackToken,
    ],
  };

  const issuerFallbackRegistration = createTestInstallationRegistration();
  const provisionerFallbackRegistration = createTestInstallationRegistration();
  const bothFallbackRegistration = createTestInstallationRegistration();

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      issuerFallbackToken,
      createTestTokenCreationCreatedResult({
        failedAttempts: [
          {
            type: "REQUEST_ERROR",
            issuer: issuerFallbackRegistration,
            error: new TestRequestError(403),
          },
        ],
      }),
    ],
    [
      provisionerFallbackToken,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-b>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
    [
      bothFallbackToken,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-c>", expires_at: "2001-02-03T04:05:06Z" },
        failedAttempts: [
          {
            type: "REQUEST_ERROR",
            issuer: bothFallbackRegistration,
            error: new TestRequestError(403),
          },
        ],
      }),
    ],
    [
      noFallbackToken,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-d>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      issuerFallbackAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [issuerFallbackTarget, createTestProvisionedResult()],
      ]),
    ],
    [
      provisionerFallbackAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [
          provisionerFallbackTarget,
          createTestProvisionedResult({
            failedAttempts: [
              {
                type: "ERROR",
                provisioner: provisionerFallbackRegistration,
                error: new Error("boom"),
              },
            ],
          }),
        ],
      ]),
    ],
    [
      bothFallbackAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [
          bothFallbackTarget,
          createTestProvisionedResult({
            failedAttempts: [
              {
                type: "ERROR",
                provisioner: bothFallbackRegistration,
                error: new Error("boom"),
              },
            ],
          }),
        ],
      ]),
    ],
    [
      noFallbackAuthResult,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [noFallbackTarget, createTestProvisionedResult()],
      ]),
    ],
  ]);

  const summary = renderSummary(
    testContext,
    [],
    authResult,
    tokenCreationResults,
    provisionResults,
  );

  expect(summary.match(/⚠️\[\^fallback\]/g)).toHaveLength(3);
  expect(summary.match(/✅/g)).toHaveLength(1);
  expect(summary.match(/\[\^fallback\]:/g)).toHaveLength(1);
  expect(summary).not.toContain(
    String(issuerFallbackRegistration.installation.app_id),
  );
  expect(summary).not.toContain(
    String(provisionerFallbackRegistration.installation.app_id),
  );
  expect(summary).not.toContain(
    String(bothFallbackRegistration.installation.app_id),
  );
  await expect(summary).toMatchFileSnapshot(join(fixturesPath, "fallback.md"));
});
