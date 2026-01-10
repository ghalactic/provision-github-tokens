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

it("supports multiple secrets per rule", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A", "SECRET_B"],
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
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    name: "SECRET_B",
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
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_B:
      ✅ Can use token declaration account-y/repo-y.token-y
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("supports multiple targets in requests", () => {
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
                    codespaces: "allow",
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
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
      {
        platform: "github",
        type: "codespaces",
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
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1
      ✅ Can provision token to GitHub Codespaces secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("supports wildcards in secret names", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
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
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    name: "SECRET_B",
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
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_B:
      ✅ Can use token declaration account-y/repo-y.token-y
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("supports rule descriptions", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            description: "<description>",
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
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1: "<description>""
  `);
});

it("allows secrets when a later rule allows access that a previous rule denied", () => {
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
                  "*": {
                    actions: "deny",
                  },
                },
                repo: { environments: {} },
                repos: {
                  "*/*": {
                    actions: "deny",
                    environments: {},
                  },
                },
              },
            },
          },
          {
            secrets: ["SECRET_A"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: {
                  "*": {
                    actions: "allow",
                  },
                },
                repo: { environments: {} },
                repos: {
                  "*/*": {
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
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 2 rules:
          ❌ Denied by rule #1
          ✅ Allowed by rule #2"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ✅ Can provision token to GitHub Actions secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #2
        ✅ Can provision secret based on 2 rules:
          ❌ Denied by rule #1
          ✅ Allowed by rule #2"
  `);
});

it("doesn't allow secrets when a later rule denies access that a previous rule allowed", () => {
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
                  "*": {
                    actions: "allow",
                  },
                },
                repo: { environments: {} },
                repos: {
                  "*/*": {
                    actions: "allow",
                    environments: {},
                  },
                },
              },
            },
          },
          {
            secrets: ["SECRET_A"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: {
                  "*": {
                    actions: "deny",
                  },
                },
                repo: { environments: {} },
                repos: {
                  "*/*": {
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
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ❌ Can't provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret based on 2 rules:
          ✅ Allowed by rule #1
          ❌ Denied by rule #2"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ❌ Can't provision token to GitHub Actions secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #2
        ❌ Can't provision secret based on 2 rules:
          ✅ Allowed by rule #1
          ❌ Denied by rule #2"
  `);
});

it("doesn't allow secrets when no rule matches the secret name", () => {
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
                  "*": {
                    actions: "allow",
                  },
                },
                repo: { environments: {} },
                repos: {
                  "*/*": {
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
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    name: "SECRET_X",
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
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_X:
      ✅ Can use token declaration account-y/repo-y.token-y
      ❌ Can't provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
});

it("doesn't allow secrets when two account patterns match but one allows and one denies", () => {
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
                  "*": {
                    actions: "deny",
                  },
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
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ❌ Can't provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret based on 1 rule:
          ❌ Denied by rule #1"
  `);
});

it("doesn't allow secrets when two repo patterns match but one allows and one denies", () => {
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
                  "*/*": {
                    actions: "deny",
                    environments: {},
                  },
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
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ❌ Can't provision token to GitHub Actions secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ❌ Can't provision secret based on 1 rule:
          ❌ Denied by rule #1"
  `);
});

it("doesn't allow secrets when some targets aren't allowed", () => {
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
                    codespaces: "deny",
                    dependabot: "allow",
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
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
      {
        platform: "github",
        type: "codespaces",
        target: { account: "account-a" },
      },
      {
        platform: "github",
        type: "dependabot",
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
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1
      ❌ Can't provision token to GitHub Codespaces secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret based on 1 rule:
          ❌ Denied by rule #1
      ✅ Can provision token to Dependabot secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("doesn't allow secrets when no targets are specified", () => {
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
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    name: "SECRET_A",
    to: [],
  });

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ❌ No targets specified"
  `);
});

it("doesn't allow secrets when the token is not allowed for a target", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({});
  const authorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["*"],
            requesters: ["*/*"],
            to: {
              github: {
                account: {},
                accounts: { "*": { actions: "allow" } },
                repo: { environments: {} },
                repos: { "*/*": { actions: "allow", environments: {} } },
              },
            },
          },
        ],
      },
    },
  );

  const resultA = authorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({ permissions: { contents: "write" } }),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ❌ Can't provision token to GitHub Actions secret in account-a:
        ❌ Account account-a was denied access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1
      ❌ Can't provision token to GitHub Actions secret in account-a/repo-a:
        ❌ Repo account-a/repo-a was denied access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("doesn't allow secrets for unshared token declarations", () => {
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
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: undefined,
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't use token declaration account-y/repo-y.token-y because it isn't shared
      ❌ Can't provision token to GitHub Actions secret in account-a:
        ❌ Token can't be authorized without a declaration
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("doesn't allow secrets for undefined token declarations", () => {
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
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: undefined,
    tokenDecIsRegistered: false,
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't use token declaration account-y/repo-y.token-y because it doesn't exist
      ❌ Can't provision token to GitHub Actions secret in account-a:
        ❌ Token can't be authorized without a declaration
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("doesn't allow secrets when the account matches but the secret type isn't allowed", () => {
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
                    codespaces: "allow",
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
    secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
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
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ❌ Can't provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
});
