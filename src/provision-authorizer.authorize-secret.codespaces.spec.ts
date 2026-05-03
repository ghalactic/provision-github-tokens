import { expect, it } from "vitest";
import {
  createTestProvisionRequest,
  createTestProvisionRequestTarget,
} from "../test/provision-request.js";
import { createTestTokenAuthorizer } from "../test/token-authorizer.js";
import { createTestTokenRequestFactory } from "../test/token-request.js";
import { compareTokenRequest } from "./compare-token-request.js";
import { createTextProvisionAuthExplainer } from "./provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";

it("allows GitHub Codespaces account secrets that should be allowed", () => {
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
                    codespaces: "allow",
                  },
                  "account-b-*": {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      to: [createTestProvisionRequestTarget("codespaces")],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-y-1", repo: "repo-y-1" },
      to: [createTestProvisionRequestTarget("codespaces", "account-b-1")],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Codespaces secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-y-1/repo-y-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Codespaces secret in account-b-1:
        ✅ Account account-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Codespaces account secrets that should be allowed within the requesting account", () => {
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
                  codespaces: "allow",
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [createTestProvisionRequestTarget("codespaces")],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-b-1", repo: "repo-b-1" },
      to: [createTestProvisionRequestTarget("codespaces", "account-b-1")],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Codespaces secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Codespaces secret in account-b-1:
        ✅ Account account-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Codespaces account secrets that should be allowed within the requesting account even when denied by an account pattern in the same rule", () => {
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
                  codespaces: "allow",
                },
                accounts: {
                  "account-a": {
                    codespaces: "deny",
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [createTestProvisionRequestTarget("codespaces")],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Codespaces secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Codespaces repo secrets that should be allowed", () => {
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
                    codespaces: "allow",
                    environments: {},
                  },
                  "account-b-*/repo-b-*": {
                    codespaces: "allow",
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      to: [
        createTestProvisionRequestTarget("codespaces", "account-a", "repo-a"),
      ],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-y-1", repo: "repo-y-1" },
      to: [
        createTestProvisionRequestTarget(
          "codespaces",
          "account-b-1",
          "repo-b-1",
        ),
      ],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Codespaces secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-y-1/repo-y-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Codespaces secret in account-b-1/repo-b-1:
        ✅ Repo account-b-1/repo-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Codespaces repo secrets that should be allowed within the requesting repo", () => {
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
                  codespaces: "allow",
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestProvisionRequestTarget("codespaces", "account-a", "repo-a"),
      ],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-b-1", repo: "repo-b-1" },
      to: [
        createTestProvisionRequestTarget(
          "codespaces",
          "account-b-1",
          "repo-b-1",
        ),
      ],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Codespaces secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Codespaces secret in account-b-1/repo-b-1:
        ✅ Repo account-b-1/repo-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Codespaces repo secrets that should be allowed within the requesting repo even when denied by a repo pattern in the same rule", () => {
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
                  codespaces: "allow",
                  environments: {},
                },
                repos: {
                  "account-a/repo-a": {
                    codespaces: "deny",
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestProvisionRequestTarget("codespaces", "account-a", "repo-a"),
      ],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-b-1", repo: "repo-b-1" },
      to: [
        createTestProvisionRequestTarget(
          "codespaces",
          "account-b-1",
          "repo-b-1",
        ),
      ],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Codespaces secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Codespaces secret in account-b-1/repo-b-1:
        ✅ Repo account-b-1/repo-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
});

it("doesn't allow GitHub Codespaces account secrets for unauthorized requesters", () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-y", repo: "repo-y" },
      to: [createTestProvisionRequestTarget("codespaces")],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Codespaces secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
});

it("doesn't allow GitHub Codespaces account secrets within the requesting account for unauthorized requesters", () => {
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
                  codespaces: "allow",
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-y", repo: "repo-y" },
      to: [createTestProvisionRequestTarget("codespaces", "account-x")],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-y" },
      to: [createTestProvisionRequestTarget("codespaces", "account-x")],
    }),
  );
  const resultC = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      to: [createTestProvisionRequestTarget("codespaces", "account-y")],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Codespaces secret in account-x:
        ✅ Account account-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Codespaces secret in account-x:
        ✅ Account account-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  expect(explain(resultC)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Codespaces secret in account-y:
        ✅ Account account-y was allowed access to token #2
        ❌ Can't provision secret (no matching rules)"
  `);
});

it("doesn't allow GitHub Codespaces account secrets within the requesting account when denied even when allowed by an account pattern in the same rule", () => {
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
                  codespaces: "deny",
                },
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [createTestProvisionRequestTarget("codespaces")],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Codespaces secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret based on 1 rule:
          ❌ Denied by rule #1"
  `);
});

it("doesn't allow GitHub Codespaces repo secrets for unauthorized requesters", () => {
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
                    codespaces: "allow",
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-y", repo: "repo-y" },
      to: [
        createTestProvisionRequestTarget("codespaces", "account-a", "repo-a"),
      ],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Codespaces secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
});

it("doesn't allow GitHub Codespaces repo secrets within the requesting repo for unauthorized requesters", () => {
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
                  codespaces: "allow",
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-y", repo: "repo-y" },
      to: [
        createTestProvisionRequestTarget("codespaces", "account-x", "repo-x"),
      ],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-y" },
      to: [
        createTestProvisionRequestTarget("codespaces", "account-x", "repo-x"),
      ],
    }),
  );
  const resultC = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      to: [
        createTestProvisionRequestTarget("codespaces", "account-x", "repo-y"),
      ],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Codespaces secret in account-x/repo-x:
        ✅ Repo account-x/repo-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Codespaces secret in account-x/repo-x:
        ✅ Repo account-x/repo-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  expect(explain(resultC)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Codespaces secret in account-x/repo-y:
        ✅ Repo account-x/repo-y was allowed access to token #2
        ❌ Can't provision secret (no matching rules)"
  `);
});

it("doesn't allow GitHub Codespaces repo secrets within the requesting repo when denied even when allowed by a repo pattern in the same rule", () => {
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
                  codespaces: "deny",
                  environments: {},
                },
                repos: {
                  "account-a/repo-a": {
                    codespaces: "allow",
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestProvisionRequestTarget("codespaces", "account-a", "repo-a"),
      ],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Codespaces secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ❌ Can't provision secret based on 1 rule:
          ❌ Denied by rule #1"
  `);
});
