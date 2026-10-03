import { join } from "node:path";
import { expect, it } from "vitest";
import { createTestTokenDec } from "../test/declaration.js";
import { createTestRepoRegistry } from "../test/repo-registry.js";
import { toMarkdown } from "./markdown.js";
import { createMarkdownTokenAuthExplainer } from "./token-auth-explainer/markdown.js";
import { createTextTokenAuthExplainer } from "./token-auth-explainer/text.js";
import { createTokenAuthorizer } from "./token-authorizer.js";

const fixturesPath = join(
  import.meta.dirname,
  "testdata/token-authorizer/visibility",
);

const toText = createTextTokenAuthExplainer();
const toMdast = createMarkdownTokenAuthExplainer();

it.each([
  ["private", "repo-private", "private", true],
  ["private", "repo-internal", "internal", false],
  ["private", "repo-public", "public", false],
  ["internal", "repo-private", "private", true],
  ["internal", "repo-internal", "internal", true],
  ["internal", "repo-public", "public", false],
  ["public", "repo-private", "private", true],
  ["public", "repo-internal", "internal", true],
  ["public", "repo-public", "public", true],
] as const)(
  "gates a %s rule against the %s repo",
  (rule, repo, repoVisibility, expected) => {
    const authorizer = createTokenAuthorizer(
      createTestRepoRegistry(["account-a", repo, repoVisibility]),
      {
        rules: [
          {
            resources: [
              {
                accounts: ["account-a"],
                noRepos: false,
                allRepos: false,
                selectedRepos: { repos: ["*"], visibility: rule },
              },
            ],
            consumers: ["account-x"],
            permissions: { contents: "write" },
          },
        ],
      },
    );

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: createTestTokenDec({
        as: "role-a",
        repos: ["*"],
        permissions: { contents: "write" },
      }),
      repos: [repo],
    });

    expect(result.isAllowed).toBe(expected);
  },
);

it("explains the visibility applied to an allowed rule", async () => {
  const authorizer = createTokenAuthorizer(
    createTestRepoRegistry(["account-a", "repo-private", "private"]),
    {
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: false,
              selectedRepos: { repos: ["*"], visibility: "private" },
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "write" },
        },
      ],
    },
  );

  const result = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      repos: ["*"],
      permissions: { contents: "write" },
    }),
    repos: ["repo-private"],
  });

  expect(toText(result)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to repos in account-a requested with role role-a
      ✅ 1 repo pattern matched 1 repo
      ✅ Sufficient access to private repo account-a/repo-private based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "allowed/a.md"),
  );
});

it("explains the visibility that excluded a rule", async () => {
  const authorizer = createTokenAuthorizer(
    createTestRepoRegistry(["account-a", "repo-public", "public"]),
    {
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: false,
              selectedRepos: { repos: ["*"], visibility: "private" },
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "write" },
        },
      ],
    },
  );

  const result = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      repos: ["*"],
      permissions: { contents: "write" },
    }),
    repos: ["repo-public"],
  });

  expect(toText(result)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to repos in account-a requested with role role-a
      ✅ 1 repo pattern matched 1 repo
      ❌ Insufficient access to public repo account-a/repo-public (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "excluded/a.md"),
  );
});

it("explains only the rules whose visibility matched", async () => {
  const authorizer = createTokenAuthorizer(
    createTestRepoRegistry(["account-a", "repo-public", "public"]),
    {
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: false,
              selectedRepos: { repos: ["*"], visibility: "private" },
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "write" },
        },
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: false,
              selectedRepos: { repos: ["*"], visibility: "public" },
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "write" },
        },
      ],
    },
  );

  const result = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      repos: ["*"],
      permissions: { contents: "write" },
    }),
    repos: ["repo-public"],
  });

  expect(toText(result)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to repos in account-a requested with role role-a
      ✅ 1 repo pattern matched 1 repo
      ✅ Sufficient access to public repo account-a/repo-public based on 1 rule:
        ✅ Rule #2 gave sufficient access:
          ✅ contents: have write, wanted write"
  `);
  await expect(toMarkdown(toMdast(result))).toMatchFileSnapshot(
    join(fixturesPath, "mixed/a.md"),
  );
});
