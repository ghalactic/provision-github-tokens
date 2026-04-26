import { join } from "node:path";
import { expect, it } from "vitest";
import type { AuthorizeResult } from "../../../src/authorizer.js";
import { compareProvisionRequest } from "../../../src/compare-provision-request.js";
import { createProvisionAuthorizer } from "../../../src/provision-authorizer.js";
import type { ProvisioningResult } from "../../../src/provisioner.js";
import { renderSummary } from "../../../src/summary.js";
import type { TokenCreationResult } from "../../../src/token-factory.js";
import type { InstallationToken } from "../../../src/type/github-api.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "../../../src/type/provision-auth-result.js";
import type { TokenAuthResult } from "../../../src/type/token-auth-result.js";
import { createTestSecretDec, createTestTokenDec } from "../../declaration.js";
import { createTestTokenAuthorizer } from "../../token-authorizer.js";
import { createTestTokenRequestFactory } from "../../token-request.js";

const fixturesPath = join(import.meta.dirname, "../../fixture/summary");
const githubServerUrl = "https://github.example.com";
const testDocsUrl = "https://github.example.com/test/action";

type SummaryOutcome =
  | "success"
  | "secret-not-allowed"
  | "token-not-allowed"
  | "no-issuer"
  | "issue-error"
  | "no-provisioner"
  | "empty-provision-results"
  | "partial-failure"
  | "failed-provision";

type SummaryTarget = {
  platform: "github";
  type: "actions";
  target: { account: string };
};

function renderSummaryFixture(
  authResult: AuthorizeResult,
  outcomes: Record<string, SummaryOutcome> = {},
): string {
  const { tokens, provisionResults } = createSummaryResults(
    authResult.provisionResults,
    outcomes,
  );

  return renderSummary(
    githubServerUrl,
    testDocsUrl,
    authResult,
    tokens,
    provisionResults,
  );
}

it("renders a summary with all secrets provisioned", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_*"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: { "account-a": { actions: "allow" } },
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });
  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_B",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummaryFixture({
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "all-provisioned.md"));
});

it("renders a summary with some secrets denied", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: { "account-a": { actions: "allow" } },
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });
  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_B",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummaryFixture({
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "some-denied.md"));
});

it("renders a summary with all secrets denied", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    { rules: { secrets: [] } },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({ permissions: { contents: "admin" } }),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummaryFixture({
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "all-denied.md"));
});

it("renders a summary with no secrets requested", async () => {
  await expect(
    renderSummaryFixture({
      provisionResults: [],
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "empty.md"));
});

it("renders a summary with environment targets", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: {},
                repo: { environments: {} },
                repos: {
                  "account-a/repo-a": {
                    actions: "allow",
                    environments: { production: "allow", staging: "allow" },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a", repo: "repo-a" },
      },
      {
        platform: "github",
        type: "environment",
        target: {
          account: "account-a",
          repo: "repo-a",
          environment: "production",
        },
      },
      {
        platform: "github",
        type: "environment",
        target: {
          account: "account-a",
          repo: "repo-a",
          environment: "staging",
        },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummaryFixture({
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "environment-targets.md"));
});

it("renders a summary with multiple requesters", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_*"],
            requesters: ["account-x/*", "account-y/*"],
            to: {
              github: {
                account: {},
                accounts: { "account-a": { actions: "allow" } },
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });
  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-y", repo: "repo-y" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_B",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummaryFixture({
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "multiple-requesters.md"));
});

it("renders a summary with a missing token declaration", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_*"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: { "account-a": { actions: "allow" } },
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });
  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: undefined,
    tokenDecIsRegistered: false,
    secretDec: createTestSecretDec(),
    name: "SECRET_B",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummaryFixture({
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "missing-token-dec.md"));
});

it("renders a summary with missing targets", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_*"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: { "account-a": { actions: "allow" } },
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });
  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_B",
    to: [],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummaryFixture({
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "missing-targets.md"));
});

it("renders a summary with multiple distinct targets", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: {
                  "account-a": { actions: "allow" },
                  "account-b": { actions: "allow" },
                },
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
      {
        platform: "github",
        type: "actions",
        target: { account: "account-b" },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummaryFixture({
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "multiple-targets.md"));
});

it("truncates rows beyond the limit and shows a notice", async () => {
  const provisionResults: ProvisionAuthResult[] = [];

  for (let i = 0; i < 1002; i++) {
    const name = `SECRET_${String(i).padStart(4, "0")}`;
    const isAllowed = i >= 10;

    provisionResults.push({
      request: {
        requester: { account: "account-x", repo: "repo-x" },
        tokenDec: createTestTokenDec(),
        tokenDecIsRegistered: true,
        secretDec: createTestSecretDec(),
        name,
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a" },
          },
        ],
      },
      results: [],
      isMissingTargets: false,
      isAllowed,
    });
  }

  await expect(
    renderSummaryFixture({
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "row-limit.md"));
});

it("renders failure reasons for provisioning outcomes", async () => {
  const requester = { account: "account-x", repo: "repo-x" };
  const targetA: SummaryTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };
  const targetB: SummaryTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-b" },
  };

  const authResult: AuthorizeResult = {
    provisionResults: [
      createAuthResult("SECRET_TOKEN_NOT_ALLOWED", [targetA], false),
      createAuthResult("SECRET_NO_ISSUER", [targetA]),
      createAuthResult("SECRET_ISSUE_ERROR", [targetA]),
      createAuthResult("SECRET_NO_PROVISIONER", [targetA]),
      createAuthResult("SECRET_FAILED_PROVISION_EMPTY", [targetA]),
      createAuthResult("SECRET_PARTIAL_FAILURE", [targetA, targetB]),
      createAuthResult("SECRET_FAILED_PROVISION", [targetA]),
    ],
    tokenResults: [],
  };

  await expect(
    renderSummaryFixture(authResult, {
      SECRET_TOKEN_NOT_ALLOWED: "token-not-allowed",
      SECRET_NO_ISSUER: "no-issuer",
      SECRET_ISSUE_ERROR: "issue-error",
      SECRET_NO_PROVISIONER: "no-provisioner",
      SECRET_FAILED_PROVISION_EMPTY: "empty-provision-results",
      SECRET_PARTIAL_FAILURE: "partial-failure",
      SECRET_FAILED_PROVISION: "failed-provision",
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "failure-reasons.md"));

  function createAuthResult(
    name: string,
    to: readonly SummaryTarget[],
    isTokenAllowed = true,
  ): ProvisionAuthResult {
    const tokenAuthResult = createTokenAuthResult(name);

    return {
      isAllowed: true,
      isMissingTargets: false,
      request: {
        requester,
        tokenDec: createTestTokenDec(),
        tokenDecIsRegistered: true,
        secretDec: createTestSecretDec(),
        name,
        to: [...to],
      },
      results: to.map((target) =>
        createTargetAuthResult(target, tokenAuthResult, isTokenAllowed),
      ),
    };
  }
});

function createSummaryResults(
  authResults: ProvisionAuthResult[],
  outcomes: Record<string, SummaryOutcome>,
): {
  tokens: Map<TokenAuthResult, TokenCreationResult>;
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >;
} {
  const tokens = new Map<TokenAuthResult, TokenCreationResult>();
  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  for (const authResult of authResults) {
    const outcome = outcomes[authResult.request.name] ?? outcomeFor(authResult);
    const targetResults = new Map<
      ProvisionAuthTargetResult,
      ProvisioningResult
    >();
    provisionResults.set(authResult, targetResults);

    switch (outcome) {
      case "secret-not-allowed":
        for (const targetAuth of authResult.results) {
          targetResults.set(targetAuth, { type: "NOT_ALLOWED" });
        }
        setTokenResults(tokens, authResult, { type: "NOT_ALLOWED" });
        break;

      case "token-not-allowed":
        for (const targetAuth of authResult.results) {
          targetResults.set(targetAuth, { type: "NO_TOKEN" });
        }
        setTokenResults(tokens, authResult, { type: "NOT_ALLOWED" });
        break;

      case "no-issuer":
        for (const targetAuth of authResult.results) {
          targetResults.set(targetAuth, { type: "NO_TOKEN" });
        }
        setTokenResults(tokens, authResult, { type: "NO_ISSUER" });
        break;

      case "issue-error":
        for (const targetAuth of authResult.results) {
          targetResults.set(targetAuth, { type: "NO_TOKEN" });
        }
        setTokenResults(tokens, authResult, {
          type: "REQUEST_ERROR",
          error: new Error("boom") as never,
        });
        break;

      case "no-provisioner":
        for (const targetAuth of authResult.results) {
          targetResults.set(targetAuth, { type: "NO_PROVISIONER" });
        }
        setTokenResults(tokens, authResult, {
          type: "CREATED",
          token: createTestToken(),
        });
        break;

      case "empty-provision-results":
        setTokenResults(tokens, authResult, {
          type: "CREATED",
          token: createTestToken(),
        });
        break;

      case "partial-failure": {
        if (authResult.results.length > 0) {
          targetResults.set(authResult.results[0], { type: "PROVISIONED" });
          for (let i = 1; i < authResult.results.length; i++) {
            targetResults.set(authResult.results[i], {
              type: "ERROR",
              error: new Error("boom"),
            });
          }
        }
        setTokenResults(tokens, authResult, {
          type: "CREATED",
          token: createTestToken(),
        });
        break;
      }

      case "failed-provision":
        for (const targetAuth of authResult.results) {
          targetResults.set(targetAuth, {
            type: "ERROR",
            error: new Error("boom"),
          });
        }
        setTokenResults(tokens, authResult, {
          type: "CREATED",
          token: createTestToken(),
        });
        break;

      case "success":
      default:
        for (const targetAuth of authResult.results) {
          targetResults.set(targetAuth, { type: "PROVISIONED" });
        }
        setTokenResults(tokens, authResult, {
          type: "CREATED",
          token: createTestToken(),
        });
        break;
    }
  }

  return { tokens, provisionResults };
}

function outcomeFor(authResult: ProvisionAuthResult): SummaryOutcome {
  return authResult.isAllowed ? "success" : "secret-not-allowed";
}

function setTokenResults(
  tokens: Map<TokenAuthResult, TokenCreationResult>,
  authResult: ProvisionAuthResult,
  tokenResult: TokenCreationResult,
): void {
  for (const targetAuth of authResult.results) {
    if (targetAuth.tokenAuthResult && !tokens.has(targetAuth.tokenAuthResult)) {
      tokens.set(targetAuth.tokenAuthResult, tokenResult);
    }
  }
}

function createTestToken(): InstallationToken {
  return { token: "<token>", expires_at: "2001-02-03T04:05:06Z" };
}

function createTokenAuthResult(name: string): TokenAuthResult {
  void name;

  return {
    type: "ALL_REPOS",
    have: { metadata: "read" },
    isAllowed: true,
    isMissingRole: false,
    isSufficient: true,
    maxWant: "read",
    request: {
      consumer: { account: "account-x" },
      repos: "all",
      tokenDec: createTestTokenDec(),
    },
    rules: [],
  };
}

function createTargetAuthResult(
  target: SummaryTarget,
  tokenAuthResult: TokenAuthResult,
  isTokenAllowed = true,
): ProvisionAuthTargetResult {
  return {
    target,
    rules: [],
    have: "allow",
    tokenAuthResult,
    isTokenAllowed,
    isProvisionAllowed: true,
    isAllowed: isTokenAllowed,
  };
}
