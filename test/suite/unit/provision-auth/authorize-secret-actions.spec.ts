import { expect, it } from "vitest";
import { compareTokenRequest } from "../../../../src/compare-token-request.js";
import { createTextProvisionAuthExplainer } from "../../../../src/provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "../../../../src/provision-authorizer.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../../../declaration.js";
import { createTestTokenAuthorizer } from "../../../token-authorizer.js";
import { createTestTokenRequestFactory } from "../../../token-request.js";

it("allows GitHub Actions account secrets that should be allowed", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-x/repo-x", "account-y-*/repo-y-*"],
            to: {
              github: {
                account: {},
                accounts: {
                  "account-a": {
                    actions: "allow",
                  },
                  "account-b-*": {
                    actions: "allow",
                  },
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

  const resultA = authorizer.authorizeSecret({
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
  const resultB = authorizer.authorizeSecret({
    requester: { account: "account-y-1", repo: "repo-y-1" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-b-1" },
      },
    ],
  });

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-y-1/repo-y-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account-b-1:
        ✅ Account account-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Actions account secrets that should be allowed within the requesting account", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a", "account-b-*/repo-b-*"],
            to: {
              github: {
                account: {
                  actions: "allow",
                },
                accounts: {},
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  const resultA = authorizer.authorizeSecret({
    requester: { account: "account-a", repo: "repo-a" },
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
  const resultB = authorizer.authorizeSecret({
    requester: { account: "account-b-1", repo: "repo-b-1" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-b-1" },
      },
    ],
  });

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account-b-1:
        ✅ Account account-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Actions account secrets that should be allowed within the requesting account even when denied by an account pattern in the same rule", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: {
                  actions: "allow",
                },
                accounts: {
                  "account-a": {
                    actions: "deny",
                  },
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

  const resultA = authorizer.authorizeSecret({
    requester: { account: "account-a", repo: "repo-a" },
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

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Actions repo secrets that should be allowed", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-x/repo-x", "account-y-*/repo-y-*"],
            to: {
              github: {
                account: {},
                accounts: {},
                repo: { environments: {} },
                repos: {
                  "account-a/repo-a": {
                    actions: "allow",
                    environments: {},
                  },
                  "account-b-*/repo-b-*": {
                    actions: "allow",
                    environments: {},
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  const resultA = authorizer.authorizeSecret({
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
    ],
  });
  const resultB = authorizer.authorizeSecret({
    requester: { account: "account-y-1", repo: "repo-y-1" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-b-1", repo: "repo-b-1" },
      },
    ],
  });

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-y-1/repo-y-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account-b-1/repo-b-1:
        ✅ Repo account-b-1/repo-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Actions repo secrets that should be allowed within the requesting repo", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a", "account-b-*/repo-b-*"],
            to: {
              github: {
                account: {},
                accounts: {},
                repo: {
                  actions: "allow",
                  environments: {},
                },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  const resultA = authorizer.authorizeSecret({
    requester: { account: "account-a", repo: "repo-a" },
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
    ],
  });
  const resultB = authorizer.authorizeSecret({
    requester: { account: "account-b-1", repo: "repo-b-1" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-b-1", repo: "repo-b-1" },
      },
    ],
  });

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account-b-1/repo-b-1:
        ✅ Repo account-b-1/repo-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Actions repo secrets that should be allowed within the requesting repo even when denied by a repo pattern in the same rule", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a", "account-b-*/repo-b-*"],
            to: {
              github: {
                account: {},
                accounts: {},
                repo: {
                  actions: "allow",
                  environments: {},
                },
                repos: {
                  "account-a/repo-a": {
                    actions: "deny",
                    environments: {},
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  const resultA = authorizer.authorizeSecret({
    requester: { account: "account-a", repo: "repo-a" },
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
    ],
  });
  const resultB = authorizer.authorizeSecret({
    requester: { account: "account-b-1", repo: "repo-b-1" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-b-1", repo: "repo-b-1" },
      },
    ],
  });

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account-b-1/repo-b-1:
        ✅ Repo account-b-1/repo-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("doesn't allow GitHub Actions account secrets for unauthorized requesters", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
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
                  "account-a": {
                    actions: "allow",
                  },
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

  const resultA = authorizer.authorizeSecret({
    requester: { account: "account-y", repo: "repo-y" },
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

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
});

it("doesn't allow GitHub Actions account secrets within the requesting account for unauthorized requesters", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
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
                account: {
                  actions: "allow",
                },
                accounts: {},
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  const resultA = authorizer.authorizeSecret({
    requester: { account: "account-y", repo: "repo-y" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-x" },
      },
    ],
  });
  const resultB = authorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-y" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-x" },
      },
    ],
  });
  const resultC = authorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-y" },
      },
    ],
  });

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account-x:
        ✅ Account account-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account-x:
        ✅ Account account-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  expect(explain(resultC)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account-y:
        ✅ Account account-y was allowed access to token #2
        ❌ Can't provision secret (no matching rules)"
  `);
});

it("doesn't allow GitHub Actions account secrets within the requesting account when denied even when allowed by an account pattern in the same rule", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: {
                  actions: "deny",
                },
                accounts: {
                  "account-a": {
                    actions: "allow",
                  },
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

  const resultA = authorizer.authorizeSecret({
    requester: { account: "account-a", repo: "repo-a" },
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

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret based on 1 rule:
          ❌ Denied by rule #1"
  `);
});

it("doesn't allow GitHub Actions repo secrets for unauthorized requesters", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
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
                    environments: {},
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  const resultA = authorizer.authorizeSecret({
    requester: { account: "account-y", repo: "repo-y" },
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
    ],
  });

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
});

it("doesn't allow GitHub Actions repo secrets within the requesting repo for unauthorized requesters", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
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
                repo: {
                  actions: "allow",
                  environments: {},
                },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  const resultA = authorizer.authorizeSecret({
    requester: { account: "account-y", repo: "repo-y" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-x", repo: "repo-x" },
      },
    ],
  });
  const resultB = authorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-y" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-x", repo: "repo-x" },
      },
    ],
  });
  const resultC = authorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-x", repo: "repo-y" },
      },
    ],
  });

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account-x/repo-x:
        ✅ Repo account-x/repo-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account-x/repo-x:
        ✅ Repo account-x/repo-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  expect(explain(resultC)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account-x/repo-y:
        ✅ Repo account-x/repo-y was allowed access to token #2
        ❌ Can't provision secret (no matching rules)"
  `);
});

it("doesn't allow GitHub Actions repo secrets within the requesting repo when denied even when allowed by a repo pattern in the same rule", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: {},
                accounts: {},
                repo: {
                  actions: "deny",
                  environments: {},
                },
                repos: {
                  "account-a/repo-a": {
                    actions: "allow",
                    environments: {},
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  const resultA = authorizer.authorizeSecret({
    requester: { account: "account-a", repo: "repo-a" },
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
    ],
  });

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ❌ Can't provision secret based on 1 rule:
          ❌ Denied by rule #1"
  `);
});
