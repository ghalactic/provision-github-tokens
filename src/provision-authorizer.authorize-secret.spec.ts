import { join } from "node:path";
import { expect, it } from "vitest";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../test/declaration.js";
import {
  createTestProvisionRequest,
  createTestProvisionRequestTarget,
} from "../test/provision-request.js";
import { createTestTokenAuthorizer } from "../test/token-authorizer.js";
import { createTestTokenRequestFactory } from "../test/token-request.js";
import { compareTokenRequest } from "./compare-token-request.js";
import { toMarkdown } from "./markdown.js";
import { createMarkdownProvisionAuthExplainer } from "./provision-auth-explainer/markdown.js";
import { createTextProvisionAuthExplainer } from "./provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";

const fixturesPath = join(
  import.meta.dirname,
  "testdata/provision-authorizer/general",
);

it("supports multiple secrets per rule", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
      name: "SECRET_B",
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "multiple-secrets-per-rule/a.md"),
  );
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_B:
      ✅ Can use token declaration account-y/repo-y.token-y
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "multiple-secrets-per-rule/b.md"),
  );
});

it("supports multiple targets in requests", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
      to: [
        createTestProvisionRequestTarget("actions"),
        createTestProvisionRequestTarget("codespaces"),
      ],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "multiple-targets/a.md"),
  );
});

it("supports wildcards in secret names", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
      name: "SECRET_B",
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "wildcard-secret-names/a.md"),
  );
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_B:
      ✅ Can use token declaration account-y/repo-y.token-y
      ✅ Can provision token to GitHub Actions secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "wildcard-secret-names/b.md"),
  );
});

it("supports rule descriptions", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "rule-descriptions/a.md"),
  );
});

it("allows secrets when a later rule allows access that a previous rule denied", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
      to: [createTestProvisionRequestTarget("actions", "account-a", "repo-a")],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-after-denied/a.md"),
  );
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ✅ Can provision token to GitHub Actions secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #2
        ✅ Can provision secret based on 2 rules:
          ❌ Denied by rule #1
          ✅ Allowed by rule #2"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-after-denied/b.md"),
  );
});

it("doesn't allow secrets when a later rule denies access that a previous rule allowed", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
      to: [createTestProvisionRequestTarget("actions", "account-a", "repo-a")],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-after-allowed/a.md"),
  );
  expect(explain(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ❌ Can't provision token to GitHub Actions secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #2
        ❌ Can't provision secret based on 2 rules:
          ✅ Allowed by rule #1
          ❌ Denied by rule #2"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-after-allowed/b.md"),
  );
});

it("doesn't allow secrets when no rule matches the secret name", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
      name: "SECRET_X",
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-no-matching-secret/a.md"),
  );
});

it("doesn't allow secrets when two account patterns match but one allows and one denies", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-account-allows-and-denies/a.md"),
  );
});

it("doesn't allow secrets when two repo patterns match but one allows and one denies", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
      to: [createTestProvisionRequestTarget("actions", "account-a", "repo-a")],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-repo-allows-and-denies/a.md"),
  );
});

it("doesn't allow secrets when some targets aren't allowed", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
      to: [
        createTestProvisionRequestTarget("actions"),
        createTestProvisionRequestTarget("codespaces"),
        createTestProvisionRequestTarget("dependabot"),
      ],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-some-targets/a.md"),
  );
});

it("doesn't allow secrets when no targets are specified", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
      to: [],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );

  expect(explain(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-y/repo-y.token-y
      ❌ No targets specified"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "missing-targets/a.md"),
  );
});

it("doesn't allow secrets when the token isn't allowed for a target", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec({ permissions: { contents: "write" } }),
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
      to: [
        createTestProvisionRequestTarget("actions"),
        createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
      ],
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-token-not-allowed/a.md"),
  );
});

it("doesn't allow secrets for unshared token declarations", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: undefined,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "unshared-token-declaration/a.md"),
  );
});

it("doesn't allow secrets for undefined token declarations", async () => {
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

  const resultA = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: undefined,
      tokenDecIsRegistered: false,
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "undefined-token-declaration/a.md"),
  );
});

it("doesn't allow secrets when the account matches but the secret type isn't allowed", async () => {
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
      requester: { account: "account-x", repo: "repo-x" },
      secretDec: createTestSecretDec({ token: "account-y/repo-y.token-y" }),
    }),
  );

  const explain = createTextProvisionAuthExplainer(
    tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request)),
  );
  const toMdast = createMarkdownProvisionAuthExplainer(
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
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-secret-type-not-allowed/a.md"),
  );
});
