import { join } from "node:path";
import { expect, it } from "vitest";
import {
  createTestEnvironmentProvisionRequestTarget,
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
  "testdata/provision-authorizer/visibility",
);

it.each([
  ["private", "private", true],
  ["private", "internal", false],
  ["private", "public", false],
  ["internal", "private", true],
  ["internal", "internal", true],
  ["internal", "public", false],
  ["public", "private", true],
  ["public", "internal", true],
  ["public", "public", true],
] as const)(
  "gates a %s rule against a %s target",
  (ruleVisibility, targetVisibility, expected) => {
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
                  account: { types: {} },
                  accounts: {},
                  repo: { visibility: "private", types: { environments: {} } },
                  repos: {
                    "account-a/repo-target": {
                      visibility: ruleVisibility,
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
        requester: { account: "account-a", repo: "repo-a" },
        to: [
          createTestRepoProvisionRequestTarget(
            "actions",
            "account-a",
            "repo-target",
            targetVisibility,
          ),
        ],
      }),
    );

    expect(result.isAllowed).toBe(expected);
  },
);

it("explains the visibility applied to an allowed repo target", async () => {
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
                account: { types: {} },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-target": {
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
      requester: { account: "account-a", repo: "repo-a" },
      to: [
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-a",
          "repo-target",
          "private",
        ),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(result)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in private repo account-a/repo-target:
        ✅ Repo account-a/repo-target was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "allowed/a.md"),
  );
});

it("explains the visibility that excluded a repo target", async () => {
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
                account: { types: {} },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-target": {
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
      requester: { account: "account-a", repo: "repo-a" },
      to: [
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-a",
          "repo-target",
          "public",
        ),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(result)).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ❌ Can't provision token to GitHub Actions secret in public repo account-a/repo-target:
        ✅ Repo account-a/repo-target was allowed access to token #1
        ❌ Can't provision secret (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "excluded/a.md"),
  );
});

it("explains only the rules whose visibility matched", async () => {
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
                account: { types: {} },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-target": {
                    visibility: "private",
                    types: { actions: "allow", environments: {} },
                  },
                },
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
                  "account-a/repo-target": {
                    visibility: "public",
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
      requester: { account: "account-a", repo: "repo-a" },
      to: [
        createTestRepoProvisionRequestTarget(
          "actions",
          "account-a",
          "repo-target",
          "public",
        ),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(result)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub Actions secret in public repo account-a/repo-target:
        ✅ Repo account-a/repo-target was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #2"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "mixed/a.md"),
  );
});

it("explains the visibility of an environment target inherited from its repo", async () => {
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
                account: { types: {} },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-target": {
                    visibility: "internal",
                    types: {
                      environments: {
                        "env-a": "allow",
                      },
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

  const result = authorizer.authorizeSecret(
    createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      to: [
        createTestEnvironmentProvisionRequestTarget(
          "account-a",
          "repo-target",
          "env-a",
          "internal",
        ),
      ],
    }),
  );

  const toText = createTextProvisionAuthExplainer();
  const toMdast = createMarkdownProvisionAuthExplainer();

  expect(toText(result)).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-a/repo-a.tokenA
      ✅ Can provision token to GitHub environment env-a secret in internal repo account-a/repo-target:
        ✅ Repo account-a/repo-target was allowed access to token #1
        ✅ Can provision secret based on 1 rule:
          ✅ Allowed by rule #1"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "environment/a.md"),
  );
});
