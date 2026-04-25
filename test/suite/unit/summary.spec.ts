import { join } from "node:path";
import { expect, it } from "vitest";
import { compareProvisionRequest } from "../../../src/compare-provision-request.js";
import { createProvisionAuthorizer } from "../../../src/provision-authorizer.js";
import { renderSummary } from "../../../src/summary.js";
import type { ProvisionAuthResult } from "../../../src/type/provision-auth-result.js";
import { createTestSecretDec, createTestTokenDec } from "../../declaration.js";
import { createTestTokenAuthorizer } from "../../token-authorizer.js";
import { createTestTokenRequestFactory } from "../../token-request.js";

const fixturesPath = join(import.meta.dirname, "../../fixture/summary");
const githubServerURL = "https://github.example.com";
const testDocsURL = "https://github.example.com/test/action";

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
    renderSummary(githubServerURL, testDocsURL, {
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
    renderSummary(githubServerURL, testDocsURL, {
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
    renderSummary(githubServerURL, testDocsURL, {
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "all-denied.md"));
});

it("renders a summary with no secrets requested", async () => {
  await expect(
    renderSummary(githubServerURL, testDocsURL, {
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
    renderSummary(githubServerURL, testDocsURL, {
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
    renderSummary(githubServerURL, testDocsURL, {
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
    renderSummary(githubServerURL, testDocsURL, {
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
    renderSummary(githubServerURL, testDocsURL, {
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
    renderSummary(githubServerURL, testDocsURL, {
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "multiple-targets.md"));
});

it("truncates rows beyond the limit and shows a notice", () => {
  const provisionResults: ProvisionAuthResult[] = [];

  for (let i = 0; i < 1002; i++) {
    const name = `SECRET_${String(i).padStart(4, "0")}`;
    const isAllowed = i >= 2;

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

  const rendered = renderSummary(githubServerURL, testDocsURL, {
    provisionResults,
    tokenResults: [],
  });

  const rows = rendered.match(/^[|] [✅❌]/gm) ?? [];
  expect(rows).toHaveLength(1000);

  const deniedRows = rendered.match(/^[|] ❌/gm) ?? [];
  expect(deniedRows).toHaveLength(2);

  expect(rendered).toContain("(2 secrets not shown");
  expect(rendered).toContain("check the logs for the full list");
});
