import { join } from "node:path";
import { expect, it } from "vitest";
import { compareProvisionRequest } from "../../../src/compare-provision-request.js";
import { createProvisionAuthorizer } from "../../../src/provision-authorizer.js";
import type { ProvisioningResult } from "../../../src/provisioner.js";
import { renderSummary } from "../../../src/summary.js";
import type { TokenCreationResult } from "../../../src/token-factory.js";
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

  const tokens = new Map<TokenAuthResult, TokenCreationResult>();
  const provisioningResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  for (const authResult of provisionResults) {
    const targetResults = new Map<
      ProvisionAuthTargetResult,
      ProvisioningResult
    >();
    provisioningResults.set(authResult, targetResults);

    if (authResult.isAllowed) {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "PROVISIONED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, {
            type: "CREATED",
            token: { token: "<token>", expires_at: "2001-02-03T04:05:06Z" },
          });
        }
      }
    } else {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "NOT_ALLOWED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, { type: "NOT_ALLOWED" });
        }
      }
    }
  }

  await expect(
    renderSummary(
      githubServerUrl,
      testDocsUrl,
      { provisionResults, tokenResults: [] },
      tokens,
      provisioningResults,
    ),
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

  const tokens = new Map<TokenAuthResult, TokenCreationResult>();
  const provisioningResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  for (const authResult of provisionResults) {
    const targetResults = new Map<
      ProvisionAuthTargetResult,
      ProvisioningResult
    >();
    provisioningResults.set(authResult, targetResults);

    if (authResult.isAllowed) {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "PROVISIONED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, {
            type: "CREATED",
            token: { token: "<token>", expires_at: "2001-02-03T04:05:06Z" },
          });
        }
      }
    } else {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "NOT_ALLOWED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, { type: "NOT_ALLOWED" });
        }
      }
    }
  }

  await expect(
    renderSummary(
      githubServerUrl,
      testDocsUrl,
      { provisionResults, tokenResults: [] },
      tokens,
      provisioningResults,
    ),
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

  const tokens = new Map<TokenAuthResult, TokenCreationResult>();
  const provisioningResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  for (const authResult of provisionResults) {
    const targetResults = new Map<
      ProvisionAuthTargetResult,
      ProvisioningResult
    >();
    provisioningResults.set(authResult, targetResults);

    if (authResult.isAllowed) {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "PROVISIONED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, {
            type: "CREATED",
            token: { token: "<token>", expires_at: "2001-02-03T04:05:06Z" },
          });
        }
      }
    } else {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "NOT_ALLOWED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, { type: "NOT_ALLOWED" });
        }
      }
    }
  }

  await expect(
    renderSummary(
      githubServerUrl,
      testDocsUrl,
      { provisionResults, tokenResults: [] },
      tokens,
      provisioningResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "all-denied.md"));
});

it("renders a summary with no secrets requested", async () => {
  const tokens = new Map<TokenAuthResult, TokenCreationResult>();
  const provisioningResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  await expect(
    renderSummary(
      githubServerUrl,
      testDocsUrl,
      { provisionResults: [], tokenResults: [] },
      tokens,
      provisioningResults,
    ),
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

  const tokens = new Map<TokenAuthResult, TokenCreationResult>();
  const provisioningResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  for (const authResult of provisionResults) {
    const targetResults = new Map<
      ProvisionAuthTargetResult,
      ProvisioningResult
    >();
    provisioningResults.set(authResult, targetResults);

    if (authResult.isAllowed) {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "PROVISIONED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, {
            type: "CREATED",
            token: { token: "<token>", expires_at: "2001-02-03T04:05:06Z" },
          });
        }
      }
    } else {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "NOT_ALLOWED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, { type: "NOT_ALLOWED" });
        }
      }
    }
  }

  await expect(
    renderSummary(
      githubServerUrl,
      testDocsUrl,
      { provisionResults, tokenResults: [] },
      tokens,
      provisioningResults,
    ),
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

  const tokens = new Map<TokenAuthResult, TokenCreationResult>();
  const provisioningResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  for (const authResult of provisionResults) {
    const targetResults = new Map<
      ProvisionAuthTargetResult,
      ProvisioningResult
    >();
    provisioningResults.set(authResult, targetResults);

    if (authResult.isAllowed) {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "PROVISIONED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, {
            type: "CREATED",
            token: { token: "<token>", expires_at: "2001-02-03T04:05:06Z" },
          });
        }
      }
    } else {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "NOT_ALLOWED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, { type: "NOT_ALLOWED" });
        }
      }
    }
  }

  await expect(
    renderSummary(
      githubServerUrl,
      testDocsUrl,
      { provisionResults, tokenResults: [] },
      tokens,
      provisioningResults,
    ),
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

  const tokens = new Map<TokenAuthResult, TokenCreationResult>();
  const provisioningResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  for (const authResult of provisionResults) {
    const targetResults = new Map<
      ProvisionAuthTargetResult,
      ProvisioningResult
    >();
    provisioningResults.set(authResult, targetResults);

    if (authResult.isAllowed) {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "PROVISIONED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, {
            type: "CREATED",
            token: { token: "<token>", expires_at: "2001-02-03T04:05:06Z" },
          });
        }
      }
    } else {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "NOT_ALLOWED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, { type: "NOT_ALLOWED" });
        }
      }
    }
  }

  await expect(
    renderSummary(
      githubServerUrl,
      testDocsUrl,
      { provisionResults, tokenResults: [] },
      tokens,
      provisioningResults,
    ),
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

  const tokens = new Map<TokenAuthResult, TokenCreationResult>();
  const provisioningResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  for (const authResult of provisionResults) {
    const targetResults = new Map<
      ProvisionAuthTargetResult,
      ProvisioningResult
    >();
    provisioningResults.set(authResult, targetResults);

    if (authResult.isAllowed) {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "PROVISIONED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, {
            type: "CREATED",
            token: { token: "<token>", expires_at: "2001-02-03T04:05:06Z" },
          });
        }
      }
    } else {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "NOT_ALLOWED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, { type: "NOT_ALLOWED" });
        }
      }
    }
  }

  await expect(
    renderSummary(
      githubServerUrl,
      testDocsUrl,
      { provisionResults, tokenResults: [] },
      tokens,
      provisioningResults,
    ),
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

  const tokens = new Map<TokenAuthResult, TokenCreationResult>();
  const provisioningResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  for (const authResult of provisionResults) {
    const targetResults = new Map<
      ProvisionAuthTargetResult,
      ProvisioningResult
    >();
    provisioningResults.set(authResult, targetResults);

    if (authResult.isAllowed) {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "PROVISIONED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, {
            type: "CREATED",
            token: { token: "<token>", expires_at: "2001-02-03T04:05:06Z" },
          });
        }
      }
    } else {
      for (const targetAuth of authResult.results) {
        targetResults.set(targetAuth, { type: "NOT_ALLOWED" });
        if (
          targetAuth.tokenAuthResult &&
          !tokens.has(targetAuth.tokenAuthResult)
        ) {
          tokens.set(targetAuth.tokenAuthResult, { type: "NOT_ALLOWED" });
        }
      }
    }
  }

  await expect(
    renderSummary(
      githubServerUrl,
      testDocsUrl,
      { provisionResults, tokenResults: [] },
      tokens,
      provisioningResults,
    ),
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
  const tokens = new Map<TokenAuthResult, TokenCreationResult>();
  const provisioningResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  for (const authResult of provisionResults) {
    provisioningResults.set(
      authResult,
      new Map<ProvisionAuthTargetResult, ProvisioningResult>(),
    );
  }

  await expect(
    renderSummary(
      githubServerUrl,
      testDocsUrl,
      { provisionResults, tokenResults: [] },
      tokens,
      provisioningResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "row-limit.md"));
});

it("renders failure reasons for provisioning outcomes", async () => {
  const requester = { account: "account-x", repo: "repo-x" };
  const targetA = {
    platform: "github" as const,
    type: "actions" as const,
    target: { account: "account-a" },
  };
  const targetB = {
    platform: "github" as const,
    type: "actions" as const,
    target: { account: "account-b" },
  };

  // SECRET_TOKEN_NOT_ALLOWED — token-not-allowed outcome
  const tokenNotAllowedTokenAuth: TokenAuthResult = {
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
  const tokenNotAllowedTargetA: ProvisionAuthTargetResult = {
    target: targetA,
    rules: [],
    have: "allow",
    tokenAuthResult: tokenNotAllowedTokenAuth,
    isTokenAllowed: false,
    isProvisionAllowed: true,
    isAllowed: false,
  };
  const secretTokenNotAllowed: ProvisionAuthResult = {
    isAllowed: true,
    isMissingTargets: false,
    request: {
      requester,
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_TOKEN_NOT_ALLOWED",
      to: [targetA],
    },
    results: [tokenNotAllowedTargetA],
  };

  // SECRET_NO_ISSUER — no-issuer outcome
  const noIssuerTokenAuth: TokenAuthResult = {
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
  const noIssuerTargetA: ProvisionAuthTargetResult = {
    target: targetA,
    rules: [],
    have: "allow",
    tokenAuthResult: noIssuerTokenAuth,
    isTokenAllowed: true,
    isProvisionAllowed: true,
    isAllowed: true,
  };
  const secretNoIssuer: ProvisionAuthResult = {
    isAllowed: true,
    isMissingTargets: false,
    request: {
      requester,
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_NO_ISSUER",
      to: [targetA],
    },
    results: [noIssuerTargetA],
  };

  // SECRET_ISSUE_ERROR — issue-error outcome
  const issueErrorTokenAuth: TokenAuthResult = {
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
  const issueErrorTargetA: ProvisionAuthTargetResult = {
    target: targetA,
    rules: [],
    have: "allow",
    tokenAuthResult: issueErrorTokenAuth,
    isTokenAllowed: true,
    isProvisionAllowed: true,
    isAllowed: true,
  };
  const secretIssueError: ProvisionAuthResult = {
    isAllowed: true,
    isMissingTargets: false,
    request: {
      requester,
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_ISSUE_ERROR",
      to: [targetA],
    },
    results: [issueErrorTargetA],
  };

  // SECRET_NO_PROVISIONER — no-provisioner outcome
  const noProvisionerTokenAuth: TokenAuthResult = {
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
  const noProvisionerTargetA: ProvisionAuthTargetResult = {
    target: targetA,
    rules: [],
    have: "allow",
    tokenAuthResult: noProvisionerTokenAuth,
    isTokenAllowed: true,
    isProvisionAllowed: true,
    isAllowed: true,
  };
  const secretNoProvisioner: ProvisionAuthResult = {
    isAllowed: true,
    isMissingTargets: false,
    request: {
      requester,
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_NO_PROVISIONER",
      to: [targetA],
    },
    results: [noProvisionerTargetA],
  };

  // SECRET_FAILED_PROVISION_EMPTY — empty-provision-results outcome
  const emptyProvisionTokenAuth: TokenAuthResult = {
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
  const emptyProvisionTargetA: ProvisionAuthTargetResult = {
    target: targetA,
    rules: [],
    have: "allow",
    tokenAuthResult: emptyProvisionTokenAuth,
    isTokenAllowed: true,
    isProvisionAllowed: true,
    isAllowed: true,
  };
  const secretEmptyProvision: ProvisionAuthResult = {
    isAllowed: true,
    isMissingTargets: false,
    request: {
      requester,
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_FAILED_PROVISION_EMPTY",
      to: [targetA],
    },
    results: [emptyProvisionTargetA],
  };

  // SECRET_PARTIAL_FAILURE — partial-failure outcome (two targets)
  const partialFailureTokenAuth: TokenAuthResult = {
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
  const partialFailureTargetA: ProvisionAuthTargetResult = {
    target: targetA,
    rules: [],
    have: "allow",
    tokenAuthResult: partialFailureTokenAuth,
    isTokenAllowed: true,
    isProvisionAllowed: true,
    isAllowed: true,
  };
  const partialFailureTargetB: ProvisionAuthTargetResult = {
    target: targetB,
    rules: [],
    have: "allow",
    tokenAuthResult: partialFailureTokenAuth,
    isTokenAllowed: true,
    isProvisionAllowed: true,
    isAllowed: true,
  };
  const secretPartialFailure: ProvisionAuthResult = {
    isAllowed: true,
    isMissingTargets: false,
    request: {
      requester,
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_PARTIAL_FAILURE",
      to: [targetA, targetB],
    },
    results: [partialFailureTargetA, partialFailureTargetB],
  };

  // SECRET_FAILED_PROVISION — failed-provision outcome
  const failedProvisionTokenAuth: TokenAuthResult = {
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
  const failedProvisionTargetA: ProvisionAuthTargetResult = {
    target: targetA,
    rules: [],
    have: "allow",
    tokenAuthResult: failedProvisionTokenAuth,
    isTokenAllowed: true,
    isProvisionAllowed: true,
    isAllowed: true,
  };
  const secretFailedProvision: ProvisionAuthResult = {
    isAllowed: true,
    isMissingTargets: false,
    request: {
      requester,
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_FAILED_PROVISION",
      to: [targetA],
    },
    results: [failedProvisionTargetA],
  };

  const provisionResults = [
    secretTokenNotAllowed,
    secretNoIssuer,
    secretIssueError,
    secretNoProvisioner,
    secretEmptyProvision,
    secretPartialFailure,
    secretFailedProvision,
  ];

  const tokens = new Map<TokenAuthResult, TokenCreationResult>();
  const provisioningResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  // token-not-allowed
  const tokenNotAllowedTargets = new Map<
    ProvisionAuthTargetResult,
    ProvisioningResult
  >();
  tokenNotAllowedTargets.set(tokenNotAllowedTargetA, { type: "NO_TOKEN" });
  tokens.set(tokenNotAllowedTokenAuth, { type: "NOT_ALLOWED" });
  provisioningResults.set(secretTokenNotAllowed, tokenNotAllowedTargets);

  // no-issuer
  const noIssuerTargets = new Map<
    ProvisionAuthTargetResult,
    ProvisioningResult
  >();
  noIssuerTargets.set(noIssuerTargetA, { type: "NO_TOKEN" });
  tokens.set(noIssuerTokenAuth, { type: "NO_ISSUER" });
  provisioningResults.set(secretNoIssuer, noIssuerTargets);

  // issue-error
  const issueErrorTargets = new Map<
    ProvisionAuthTargetResult,
    ProvisioningResult
  >();
  issueErrorTargets.set(issueErrorTargetA, { type: "NO_TOKEN" });
  tokens.set(issueErrorTokenAuth, {
    type: "REQUEST_ERROR",
    error: new Error("boom") as never,
  });
  provisioningResults.set(secretIssueError, issueErrorTargets);

  // no-provisioner
  const noProvisionerTargets = new Map<
    ProvisionAuthTargetResult,
    ProvisioningResult
  >();
  noProvisionerTargets.set(noProvisionerTargetA, { type: "NO_PROVISIONER" });
  tokens.set(noProvisionerTokenAuth, {
    type: "CREATED",
    token: { token: "<token>", expires_at: "2001-02-03T04:05:06Z" },
  });
  provisioningResults.set(secretNoProvisioner, noProvisionerTargets);

  // empty-provision-results (no target results, but token is created)
  const emptyProvisionTargets = new Map<
    ProvisionAuthTargetResult,
    ProvisioningResult
  >();
  tokens.set(emptyProvisionTokenAuth, {
    type: "CREATED",
    token: { token: "<token>", expires_at: "2001-02-03T04:05:06Z" },
  });
  provisioningResults.set(secretEmptyProvision, emptyProvisionTargets);

  // partial-failure (first target provisioned, rest error)
  const partialFailureTargets = new Map<
    ProvisionAuthTargetResult,
    ProvisioningResult
  >();
  partialFailureTargets.set(partialFailureTargetA, { type: "PROVISIONED" });
  partialFailureTargets.set(partialFailureTargetB, {
    type: "ERROR",
    error: new Error("boom"),
  });
  tokens.set(partialFailureTokenAuth, {
    type: "CREATED",
    token: { token: "<token>", expires_at: "2001-02-03T04:05:06Z" },
  });
  provisioningResults.set(secretPartialFailure, partialFailureTargets);

  // failed-provision
  const failedProvisionTargets = new Map<
    ProvisionAuthTargetResult,
    ProvisioningResult
  >();
  failedProvisionTargets.set(failedProvisionTargetA, {
    type: "ERROR",
    error: new Error("boom"),
  });
  tokens.set(failedProvisionTokenAuth, {
    type: "CREATED",
    token: { token: "<token>", expires_at: "2001-02-03T04:05:06Z" },
  });
  provisioningResults.set(secretFailedProvision, failedProvisionTargets);

  await expect(
    renderSummary(
      githubServerUrl,
      testDocsUrl,
      { provisionResults, tokenResults: [] },
      tokens,
      provisioningResults,
    ),
  ).toMatchFileSnapshot(join(fixturesPath, "failure-reasons.md"));
});
