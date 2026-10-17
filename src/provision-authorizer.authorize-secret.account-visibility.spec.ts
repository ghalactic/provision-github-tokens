import { join } from "node:path";
import { expect, it } from "vitest";
import {
  createTestAccountProvisionRequestTarget,
  createTestProvisionRequest,
} from "../test/provision-request.js";
import { createTestTokenAuthorizer } from "../test/token-authorizer.js";
import { createTestTokenRequestFactory } from "../test/token-request.js";
import { toMarkdown } from "./markdown.js";
import { createMarkdownProvisionAuthExplainer } from "./provision-auth-explainer/markdown.js";
import { createTextProvisionAuthExplainer } from "./provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";

const fixturesPath = join(
  import.meta.dirname,
  "testdata/provision-authorizer/account-visibility",
);

it("explains the account secret visibility toggles", async () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
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
                    actions: {
                      allRepos: "allow",
                      privateRepos: "deny",
                      noRepos: "deny",
                    },
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

  const resultAll = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestAccountProvisionRequestTarget("actions", "account-a", "all"),
      ],
    }),
  );
  const resultPrivate = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestAccountProvisionRequestTarget(
          "actions",
          "account-a",
          "private",
        ),
      ],
    }),
  );
  const resultNoRepos = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestAccountProvisionRequestTarget("actions", "account-a", {
          patterns: [],
          repos: [],
        }),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(resultAll.isAllowed).toBe(true);
  expect(toText(resultAll)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision to all repos based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultAll))).toMatchFileSnapshot(
    join(fixturesPath, "toggles/all.md"),
  );

  expect(resultPrivate.isAllowed).toBe(false);
  expect(toText(resultPrivate)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision to private repos based on 1 rule:
          ❌ Denied by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultPrivate))).toMatchFileSnapshot(
    join(fixturesPath, "toggles/private.md"),
  );

  expect(resultNoRepos.isAllowed).toBe(false);
  expect(toText(resultNoRepos)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision to no repos based on 1 rule:
          ❌ Denied by rule #1"
  `);
  await expect(toMarkdown(toMdast(resultNoRepos))).toMatchFileSnapshot(
    join(fixturesPath, "toggles/no-repos.md"),
  );
});

it("explains an account secret visibility toggle with no matching rules", async () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: {} } },
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

  const result = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestAccountProvisionRequestTarget(
          "actions",
          "account-a",
          "private",
        ),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(result.isAllowed).toBe(false);
  expect(toText(result)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision to private repos (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "unspecified/private.md"),
  );
});

it("explains a selected account secret when the gate and every repo allow it", async () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "allow" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {},
              },
            },
          },
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: {} },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-*": {
                    visibility: "private",
                    types: { actions: "allow", environments: {} },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  const result = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestAccountProvisionRequestTarget("actions", "account-a", {
          patterns: ["repo-*"],
          repos: [
            {
              ref: { account: "account-a", repo: "repo-x" },
              id: 1,
              visibility: "private",
            },
            {
              ref: { account: "account-a", repo: "repo-y" },
              id: 2,
              visibility: "private",
            },
          ],
        }),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(result.isAllowed).toBe(true);
  expect(toText(result)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision to selected repos based on 1 rule:
          ✅ Allowed by rule #1
        ✅ Can provision secret to private repo account-a/repo-x:
          ✅ Allowed by rule #2
        ✅ Can provision secret to private repo account-a/repo-y:
          ✅ Allowed by rule #2"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "selected/allowed.md"),
  );
});

it("explains a selected account secret when a repo's visibility excludes it", async () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "allow" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {},
              },
            },
          },
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: {} },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-*": {
                    visibility: "private",
                    types: { actions: "allow", environments: {} },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  const result = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestAccountProvisionRequestTarget("actions", "account-a", {
          patterns: ["repo-*"],
          repos: [
            {
              ref: { account: "account-a", repo: "repo-x" },
              id: 1,
              visibility: "private",
            },
            {
              ref: { account: "account-a", repo: "repo-y" },
              id: 2,
              visibility: "public",
            },
          ],
        }),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(result.isAllowed).toBe(false);
  expect(toText(result)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision to selected repos based on 1 rule:
          ✅ Allowed by rule #1
        ✅ Can provision secret to private repo account-a/repo-x:
          ✅ Allowed by rule #2
        ❌ Can't provision secret to public repo account-a/repo-y:
          ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "selected/excluded.md"),
  );
});

it("explains a selected account secret when the gate denies it", async () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "deny" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {},
              },
            },
          },
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: {} },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-*": {
                    visibility: "private",
                    types: { actions: "allow", environments: {} },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  const result = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestAccountProvisionRequestTarget("actions", "account-a", {
          patterns: ["repo-*"],
          repos: [
            {
              ref: { account: "account-a", repo: "repo-x" },
              id: 1,
              visibility: "private",
            },
          ],
        }),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(result.isAllowed).toBe(false);
  expect(toText(result)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ❌ Can't provision to selected repos based on 1 rule:
          ❌ Denied by rule #1
        ✅ Can provision secret to private repo account-a/repo-x:
          ✅ Allowed by rule #2"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "selected/gate-denied.md"),
  );
});

it("explains a selected account secret when a named repo matches no rule", async () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "allow" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {},
              },
            },
          },
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: {} },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-x": {
                    visibility: "private",
                    types: { actions: "allow", environments: {} },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  const result = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestAccountProvisionRequestTarget("actions", "account-a", {
          patterns: ["repo-*"],
          repos: [
            {
              ref: { account: "account-a", repo: "repo-x" },
              id: 1,
              visibility: "private",
            },
            {
              ref: { account: "account-a", repo: "repo-z" },
              id: 3,
              visibility: "private",
            },
          ],
        }),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(result.isAllowed).toBe(false);
  expect(toText(result)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision to selected repos based on 1 rule:
          ✅ Allowed by rule #1
        ✅ Can provision secret to private repo account-a/repo-x:
          ✅ Allowed by rule #2
        ❌ Can't provision secret to private repo account-a/repo-z:
          ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "selected/repo-unmatched.md"),
  );
});

it("explains a selected account secret whose patterns matched no repos", async () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
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
                    actions: { selectedRepos: "allow", noRepos: "allow" },
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

  const result = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestAccountProvisionRequestTarget("actions", "account-a", {
          patterns: ["team-*", "other-*"],
          repos: [],
        }),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(result.isAllowed).toBe(false);
  expect(toText(result)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision to selected repos based on 1 rule:
          ✅ Allowed by rule #1
        ❌ No repositories matched the patterns team-*, other-*"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "selected/matched-nothing.md"),
  );
});

it("skips rules that don't match the secret name or the requester", async () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "allow" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-*": {
                    visibility: "private",
                    types: { actions: "allow", environments: {} },
                  },
                },
              },
            },
          },
          {
            secrets: ["OTHER_SECRET"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "deny" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-*": {
                    visibility: "private",
                    types: { actions: "deny", environments: {} },
                  },
                },
              },
            },
          },
          {
            secrets: ["SECRET_A"],
            requesters: ["other-account/repo"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "deny" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-*": {
                    visibility: "private",
                    types: { actions: "deny", environments: {} },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  const result = authorizer.authorizeSecret(
    createTestProvisionRequest({
      to: [
        createTestAccountProvisionRequestTarget("actions", "account-a", {
          patterns: ["repo-*"],
          repos: [
            {
              ref: { account: "account-a", repo: "repo-x" },
              id: 1,
              visibility: "private",
            },
          ],
        }),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(result.isAllowed).toBe(true);
  expect(toText(result)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in account account-a:
        ✅ Account account-a was allowed access to token #1
        ✅ Can provision to selected repos based on 1 rule:
          ✅ Allowed by rule #1
        ✅ Can provision secret to private repo account-a/repo-x:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "skips-non-matching-rules/allowed.md"),
  );
});
