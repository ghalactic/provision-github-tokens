import { join } from "node:path";
import { expect, it } from "vitest";
import {
  createTestAccountProvisionRequestTarget,
  createTestProvisionRequest,
  createTestRepoProvisionRequestTarget,
} from "../test/provision-request.js";
import { createTestTokenAuthorizer } from "../test/token-authorizer.js";
import { createTestTokenRequestFactory } from "../test/token-request.js";
import { toMarkdown } from "./markdown.js";
import { createMarkdownProvisionAuthExplainer } from "./provision-auth-explainer/markdown.js";
import { createTextProvisionAuthExplainer } from "./provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";

const fixturesPath = join(
  import.meta.dirname,
  "testdata/provision-authorizer/actions",
);

it("allows GitHub Actions account secrets that should be allowed", async () => {
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
                account: { types: {} },
                accounts: {
                  "account-a": {
                    types: {
                      actions: "allow",
                    },
                  },
                  "account-b-*": {
                    types: {
                      actions: "allow",
                    },
                  },
                },
                repo: { visibility: "private", types: { environments: {} } },
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
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-y-1", repo: "repo-y-1" },
      to: [createTestAccountProvisionRequestTarget("actions", "account-b-1")],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account account-a:
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
      ✅ Can provision token to GitHub Actions secret in account account-b-1:
        ✅ Account account-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-account/b.md"),
  );
});

it("allows GitHub Actions account secrets that should be allowed within the requesting account", async () => {
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
                  types: {
                    actions: "allow",
                  },
                },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  const resultA = authorizer.authorizeSecret(createTestProvisionRequest());
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-b-1", repo: "repo-b-1" },
      to: [createTestAccountProvisionRequestTarget("actions", "account-b-1")],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account account-a:
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
      ✅ Can provision token to GitHub Actions secret in account account-b-1:
        ✅ Account account-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-account-self/b.md"),
  );
});

it("allows GitHub Actions account secrets that should be allowed within the requesting account even when denied by an account pattern in the same rule", async () => {
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
                  types: {
                    actions: "allow",
                  },
                },
                accounts: {
                  "account-a": {
                    types: {
                      actions: "deny",
                    },
                  },
                },
                repo: { visibility: "private", types: { environments: {} } },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  const resultA = authorizer.authorizeSecret(createTestProvisionRequest());

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-account-self-overrides-pattern/a.md"),
  );
});

it("allows GitHub Actions repo secrets that should be allowed", async () => {
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
                account: { types: {} },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-a": {
                    visibility: "private",
                    types: {
                      actions: "allow",
                      environments: {},
                    },
                  },
                  "account-b-*/repo-b-*": {
                    visibility: "private",
                    types: {
                      actions: "allow",
                      environments: {},
                    },
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
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-a",
          "repo-a",
          "private",
        ),
      ],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-y-1", repo: "repo-y-1" },
      to: [
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-b-1",
          "repo-b-1",
          "private",
        ),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in private repo account-a/repo-a:
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
      ✅ Can provision token to GitHub Actions secret in private repo account-b-1/repo-b-1:
        ✅ Repo account-b-1/repo-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-repo/b.md"),
  );
});

it("allows GitHub Actions repo secrets that should be allowed within the requesting repo", async () => {
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
                account: { types: {} },
                accounts: {},
                repo: {
                  visibility: "private",
                  types: {
                    actions: "allow",
                    environments: {},
                  },
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
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-a",
          "repo-a",
          "private",
        ),
      ],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-b-1", repo: "repo-b-1" },
      to: [
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-b-1",
          "repo-b-1",
          "private",
        ),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in private repo account-a/repo-a:
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
      ✅ Can provision token to GitHub Actions secret in private repo account-b-1/repo-b-1:
        ✅ Repo account-b-1/repo-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-repo-self/b.md"),
  );
});

it("allows GitHub Actions repo secrets that should be allowed within the requesting repo even when denied by a repo pattern in the same rule", async () => {
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
                account: { types: {} },
                accounts: {},
                repo: {
                  visibility: "private",
                  types: {
                    actions: "allow",
                    environments: {},
                  },
                },
                repos: {
                  "account-a/repo-a": {
                    visibility: "private",
                    types: {
                      actions: "deny",
                      environments: {},
                    },
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
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-a",
          "repo-a",
          "private",
        ),
      ],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-b-1", repo: "repo-b-1" },
      to: [
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-b-1",
          "repo-b-1",
          "private",
        ),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in private repo account-a/repo-a:
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
      ✅ Can provision token to GitHub Actions secret in private repo account-b-1/repo-b-1:
        ✅ Repo account-b-1/repo-b-1 was allowed access to token #2
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-repo-self-overrides-pattern/b.md"),
  );
});

it("doesn't allow GitHub Actions account secrets for unauthorized requesters", async () => {
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
                account: { types: {} },
                accounts: {
                  "account-a": {
                    types: {
                      actions: "allow",
                    },
                  },
                },
                repo: { visibility: "private", types: { environments: {} } },
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
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-account-unauthorized-requester/a.md"),
  );
});

it("doesn't allow GitHub Actions account secrets within the requesting account for unauthorized requesters", async () => {
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
                  types: {
                    actions: "allow",
                  },
                },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
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
      to: [createTestAccountProvisionRequestTarget("actions", "account-x")],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-y" },
      to: [createTestAccountProvisionRequestTarget("actions", "account-x")],
    }),
  );
  const resultC = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      to: [createTestAccountProvisionRequestTarget("actions", "account-y")],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account account-x:
        ✅ Account account-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-account-unauthorized-requester-self/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account account-x:
        ✅ Account account-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-account-unauthorized-requester-self/b.md"),
  );
  expect(toText(resultC)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account account-y:
        ✅ Account account-y was allowed access to token #2
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultC))).toMatchFileSnapshot(
    join(fixturesPath, "denied-account-unauthorized-requester-self/c.md"),
  );
});

it("doesn't allow GitHub Actions account secrets within the requesting account when denied even when allowed by an account pattern in the same rule", async () => {
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
                  types: {
                    actions: "deny",
                  },
                },
                accounts: {
                  "account-a": {
                    types: {
                      actions: "allow",
                    },
                  },
                },
                repo: { visibility: "private", types: { environments: {} } },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  const resultA = authorizer.authorizeSecret(createTestProvisionRequest());

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision secret based on 1 rule:
          ❌ Denied by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-account-self-overrides-pattern/a.md"),
  );
});

it("doesn't allow GitHub Actions repo secrets for unauthorized requesters", async () => {
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
                account: { types: {} },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-a": {
                    visibility: "private",
                    types: {
                      actions: "allow",
                      environments: {},
                    },
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
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-a",
          "repo-a",
          "private",
        ),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in private repo account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-repo-unauthorized-requester/a.md"),
  );
});

it("doesn't allow GitHub Actions repo secrets within the requesting repo for unauthorized requesters", async () => {
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
                account: { types: {} },
                accounts: {},
                repo: {
                  visibility: "private",
                  types: {
                    actions: "allow",
                    environments: {},
                  },
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
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-x",
          "repo-x",
          "private",
        ),
      ],
    }),
  );
  const resultB = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-y" },
      to: [
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-x",
          "repo-x",
          "private",
        ),
      ],
    }),
  );
  const resultC = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      to: [
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-x",
          "repo-y",
          "private",
        ),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in private repo account-x/repo-x:
        ✅ Repo account-x/repo-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-repo-unauthorized-requester-self/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in private repo account-x/repo-x:
        ✅ Repo account-x/repo-x was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-repo-unauthorized-requester-self/b.md"),
  );
  expect(toText(resultC)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in private repo account-x/repo-y:
        ✅ Repo account-x/repo-y was allowed access to token #2
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultC))).toMatchFileSnapshot(
    join(fixturesPath, "denied-repo-unauthorized-requester-self/c.md"),
  );
});

it("doesn't allow GitHub Actions repo secrets within the requesting repo when denied even when allowed by a repo pattern in the same rule", async () => {
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
                account: { types: {} },
                accounts: {},
                repo: {
                  visibility: "private",
                  types: {
                    actions: "deny",
                    environments: {},
                  },
                },
                repos: {
                  "account-a/repo-a": {
                    visibility: "private",
                    types: {
                      actions: "allow",
                      environments: {},
                    },
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
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-a",
          "repo-a",
          "private",
        ),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in private repo account-a/repo-a:
        ✅ Repo account-a/repo-a was allowed access to token #1
        ❌ Can't provision secret based on 1 rule:
          ❌ Denied by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-repo-self-overrides-pattern/a.md"),
  );
});
