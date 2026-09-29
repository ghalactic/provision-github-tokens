import { join } from "node:path";
import { expect, it } from "vitest";
import {
  createTestProvisionRequest,
  createTestProvisionRequestTarget,
} from "../test/provision-request.js";
import { createTestTokenAuthorizer } from "../test/token-authorizer.js";
import { createTestTokenRequestFactory } from "../test/token-request.js";
import { toMarkdown } from "./markdown.js";
import { createMarkdownProvisionAuthExplainer } from "./provision-auth-explainer/markdown.js";
import { createTextProvisionAuthExplainer } from "./provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";

const fixturesPath = join(
  import.meta.dirname,
  "testdata/provision-authorizer/agents",
);

it("allows GitHub Agents account secrets that should be allowed", async () => {
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
                    agents: "allow",
                  },
                  "account-b-*": {
                    agents: "allow",
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
      to: [createTestProvisionRequestTarget("agents")],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-y-1", repo: "repo-y-1" },
      to: [createTestProvisionRequestTarget("agents", "account-b-1")],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Agents secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-account/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-y-1/repo-y-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Agents secret in account-b-1:
        ✅ Account account-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-account/b.md"),
  );
});

it("allows GitHub Agents account secrets that should be allowed within the requesting account", async () => {
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
                  agents: "allow",
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
      to: [createTestProvisionRequestTarget("agents")],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-b-1", repo: "repo-b-1" },
      to: [createTestProvisionRequestTarget("agents", "account-b-1")],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Agents secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-account-self/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Agents secret in account-b-1:
        ✅ Account account-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-account-self/b.md"),
  );
});

it("allows GitHub Agents account secrets that should be allowed within the requesting account even when denied by an account pattern in the same rule", async () => {
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
                  agents: "allow",
                },
                accounts: {
                  "account-a": {
                    agents: "deny",
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
      to: [createTestProvisionRequestTarget("agents")],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Agents secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-account-self-overrides-pattern/a.md"),
  );
});

it("allows GitHub Agents repo secrets that should be allowed", async () => {
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
                    agents: "allow",
                    environments: {},
                  },
                  "account-b-*/repo-b-*": {
                    agents: "allow",
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
      to: [createTestProvisionRequestTarget("agents", "account-a", "repo-a")],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-y-1", repo: "repo-y-1" },
      to: [
        createTestProvisionRequestTarget("agents", "account-b-1", "repo-b-1"),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Agents secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-repo/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-y-1/repo-y-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Agents secret in account-b-1/repo-b-1:
        ✅ Repo account-b-1/repo-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-repo/b.md"),
  );
});

it("allows GitHub Agents repo secrets that should be allowed within the requesting repo", async () => {
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
                  agents: "allow",
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
      to: [createTestProvisionRequestTarget("agents", "account-a", "repo-a")],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-b-1", repo: "repo-b-1" },
      to: [
        createTestProvisionRequestTarget("agents", "account-b-1", "repo-b-1"),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Agents secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-repo-self/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Agents secret in account-b-1/repo-b-1:
        ✅ Repo account-b-1/repo-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-repo-self/b.md"),
  );
});

it("allows GitHub Agents repo secrets that should be allowed within the requesting repo even when denied by a repo pattern in the same rule", async () => {
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
                  agents: "allow",
                  environments: {},
                },
                repos: {
                  "account-a/repo-a": {
                    agents: "deny",
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
      to: [createTestProvisionRequestTarget("agents", "account-a", "repo-a")],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-b-1", repo: "repo-b-1" },
      to: [
        createTestProvisionRequestTarget("agents", "account-b-1", "repo-b-1"),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Agents secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-repo-self-overrides-pattern/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Agents secret in account-b-1/repo-b-1:
        ✅ Repo account-b-1/repo-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-repo-self-overrides-pattern/b.md"),
  );
});

it("doesn't allow GitHub Agents account secrets for unauthorized requesters", async () => {
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
                    agents: "allow",
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
      to: [createTestProvisionRequestTarget("agents")],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Agents secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-account-unauthorized-requester/a.md"),
  );
});

it("doesn't allow GitHub Agents account secrets within the requesting account for unauthorized requesters", async () => {
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
                  agents: "allow",
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
      to: [createTestProvisionRequestTarget("agents", "account-x")],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-y" },
      to: [createTestProvisionRequestTarget("agents", "account-x")],
    }),
  );
  const resultC = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      to: [createTestProvisionRequestTarget("agents", "account-y")],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Agents secret in account-x:
        ✅ Account account-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-account-unauthorized-requester-self/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Agents secret in account-x:
        ✅ Account account-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-account-unauthorized-requester-self/b.md"),
  );
  expect(toText(resultC)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Agents secret in account-y:
        ✅ Account account-y was allowed access to token #2
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultC))).toMatchFileSnapshot(
    join(fixturesPath, "denied-account-unauthorized-requester-self/c.md"),
  );
});

it("doesn't allow GitHub Agents account secrets within the requesting account when denied even when allowed by an account pattern in the same rule", async () => {
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
                  agents: "deny",
                },
                accounts: {
                  "account-a": {
                    agents: "allow",
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
      to: [createTestProvisionRequestTarget("agents")],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Agents secret in account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret based on 1 rule:
          ❌ Denied by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-account-self-overrides-pattern/a.md"),
  );
});

it("doesn't allow GitHub Agents repo secrets for unauthorized requesters", async () => {
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
                    agents: "allow",
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
      to: [createTestProvisionRequestTarget("agents", "account-a", "repo-a")],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Agents secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-repo-unauthorized-requester/a.md"),
  );
});

it("doesn't allow GitHub Agents repo secrets within the requesting repo for unauthorized requesters", async () => {
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
                  agents: "allow",
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
      to: [createTestProvisionRequestTarget("agents", "account-x", "repo-x")],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-y" },
      to: [createTestProvisionRequestTarget("agents", "account-x", "repo-x")],
    }),
  );
  const resultC = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      to: [createTestProvisionRequestTarget("agents", "account-x", "repo-y")],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Agents secret in account-x/repo-x:
        ✅ Repo account-x/repo-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-repo-unauthorized-requester-self/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Agents secret in account-x/repo-x:
        ✅ Repo account-x/repo-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-repo-unauthorized-requester-self/b.md"),
  );
  expect(toText(resultC)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Agents secret in account-x/repo-y:
        ✅ Repo account-x/repo-y was allowed access to token #2
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultC))).toMatchFileSnapshot(
    join(fixturesPath, "denied-repo-unauthorized-requester-self/c.md"),
  );
});

it("doesn't allow GitHub Agents repo secrets within the requesting repo when denied even when allowed by a repo pattern in the same rule", async () => {
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
                  agents: "deny",
                  environments: {},
                },
                repos: {
                  "account-a/repo-a": {
                    agents: "allow",
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
      to: [createTestProvisionRequestTarget("agents", "account-a", "repo-a")],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Agents secret in account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ❌ Can't provision secret based on 1 rule:
          ❌ Denied by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-repo-self-overrides-pattern/a.md"),
  );
});
