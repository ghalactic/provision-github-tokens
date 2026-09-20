import { join } from "node:path";
import { expect, it } from "vitest";
import { createTestTokenDec } from "../test/declaration.js";
import { toMarkdown } from "./markdown.js";
import { createMarkdownTokenAuthExplainer } from "./token-auth-explainer/markdown.js";
import { createTextTokenAuthExplainer } from "./token-auth-explainer/text.js";
import { createTokenAuthorizer } from "./token-authorizer.js";

const fixturesPath = join(
  import.meta.dirname,
  "testdata/token-authorizer/all-repos",
);

const toText = createTextTokenAuthExplainer();
const toMdast = createMarkdownTokenAuthExplainer();

it("allows tokens that should be allowed", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write", metadata: "read" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write", metadata: "read" },
    }),
    repos: "all",
  });
  const resultC = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write" },
    }),
    repos: "all",
  });
  const resultD = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write", metadata: "read" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed/b.md"),
  );
  expect(toText(resultC)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultC))).toMatchFileSnapshot(
    join(fixturesPath, "allowed/c.md"),
  );
  expect(toText(resultD)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultD))).toMatchFileSnapshot(
    join(fixturesPath, "allowed/d.md"),
  );
});

it("allows tokens when the actual access level is higher than requested", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "write", repository_projects: "admin" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { metadata: "read", repository_projects: "write" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { metadata: "read", repository_projects: "write" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have write, wanted read
          ✅ repository_projects: have admin, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-access-level-higher/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have write, wanted read
          ✅ repository_projects: have admin, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-access-level-higher/b.md"),
  );
});

it("allows tokens when a later rule allows access that a previous rule denied", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "read", metadata: "read" },
      },
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write", metadata: "read" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write", metadata: "read" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 2 rules:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have read, wanted write
          ✅ metadata: have read, wanted read
        ✅ Rule #2 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-after-denied/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 2 rules:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have read, wanted write
          ✅ metadata: have read, wanted read
        ✅ Rule #2 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-after-denied/b.md"),
  );
});

it("allows tokens when a later unrelated rule denies access to the requested permission", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write", metadata: "read" },
      },
      {
        resources: [
          {
            accounts: ["account-b"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "none" },
      },
      {
        resources: [
          {
            accounts: ["account-b"],
            noRepos: false,
            allRepos: false,
            selectedRepos: ["repo-b"],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "none" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write", metadata: "read" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write", metadata: "read" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-unrelated-denied/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-unrelated-denied/b.md"),
  );
});

it("allows read-only tokens without a role", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write", metadata: "read" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      permissions: { contents: "read", metadata: "read" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      permissions: { contents: "read", metadata: "read" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Read access to all repos in account-a requested without a role
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted read
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-read-only-no-role/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Read access to all repos in account-a requested without a role
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted read
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-read-only-no-role/b.md"),
  );
});

it("supports rule descriptions", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        description: "<description>",
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "read" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({ as: "role-a" }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({ as: "role-a" }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1: "<description>" gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "rule-descriptions/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1: "<description>" gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "rule-descriptions/b.md"),
  );
});

it("sorts permissions in the explanation", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "read", contents: "write" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { metadata: "read", contents: "write" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { metadata: "read", contents: "write" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "sorted-permissions/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "sorted-permissions/b.md"),
  );
});

it("doesn't allow tokens for unauthorized consumers", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write", metadata: "read" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-y" },
    tokenDec: createTestTokenDec({ as: "role-a" }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-y", repo: "repo-x" },
    tokenDec: createTestTokenDec({ as: "role-a" }),
    repos: "all",
  });
  const resultC = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-y" },
    tokenDec: createTestTokenDec({ as: "role-a" }),
    repos: "all",
  });
  const resultD = authorizer.authorizeToken({
    consumer: { account: "account-y", repo: "repo-y" },
    tokenDec: createTestTokenDec({ as: "role-a" }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-y was denied access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-unauthed-consumer/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-x was denied access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-unauthed-consumer/b.md"),
  );
  expect(toText(resultC)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y was denied access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultC))).toMatchFileSnapshot(
    join(fixturesPath, "denied-unauthed-consumer/c.md"),
  );
  expect(toText(resultD)).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y was denied access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultD))).toMatchFileSnapshot(
    join(fixturesPath, "denied-unauthed-consumer/d.md"),
  );
});

it("doesn't allow tokens for unauthorized resource repos", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write", metadata: "read" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      account: "account-y",
      permissions: { contents: "write" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      account: "account-y",
      permissions: { contents: "write" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to all repos in account-y requested with role role-a
      ❌ Insufficient access to all repos in account-y (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-unauthed-resource-repo/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Write access to all repos in account-y requested with role role-a
      ❌ Insufficient access to all repos in account-y (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-unauthed-resource-repo/b.md"),
  );
});

it("doesn't allow tokens for unauthorized permissions", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "read" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "read" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "read" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-unauthed-perms/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-unauthed-perms/b.md"),
  );
});

it("doesn't allow tokens where only some of the permissions are authorized", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "read" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "read", metadata: "read" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "read", metadata: "read" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted read
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-partial-perms/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted read
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-partial-perms/b.md"),
  );
});

it("doesn't allow tokens that are denied by a wildcard rule", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "read" },
      },
      {
        resources: [
          {
            accounts: ["account-*"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "none" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({ as: "role-a" }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({ as: "role-a" }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read
        ❌ Rule #2 gave insufficient access:
          ❌ metadata: have none, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-wildcard/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read
        ❌ Rule #2 gave insufficient access:
          ❌ metadata: have none, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-wildcard/b.md"),
  );
});

it("doesn't allow tokens when the actual access level is lower than requested", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { repository_projects: "write" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { repository_projects: "admin" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { repository_projects: "admin" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Admin access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ repository_projects: have write, wanted admin"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-lower-access/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Admin access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ repository_projects: have write, wanted admin"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-lower-access/b.md"),
  );
});

it("doesn't allow tokens for all repos in an account unless a resource rule explicitly allows all repos", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: false,
            selectedRepos: ["repo-a"],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "read" },
      },
      {
        resources: [
          {
            accounts: ["account-b"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "read" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "read" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "read" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-no-all-repos-rule/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a (no matching rules)"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-no-all-repos-rule/b.md"),
  );
});

it("doesn't allow tokens when a later rule denies access that a previous rule allowed", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write" },
      },
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "read" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have read, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-after-allowed/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have read, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-after-allowed/b.md"),
  );
});

it("doesn't allow tokens when a later rule removes access that a previous rule allowed", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write" },
      },
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "none" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write" },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have none, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-removed/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have none, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-removed/b.md"),
  );
});

it("doesn't allow write tokens if no role is specified", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: {
          repository_hooks: "write",
          repository_projects: "admin",
        },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      permissions: {
        repository_hooks: "read",
        repository_projects: "write",
      },
    }),
    repos: "all",
  });
  const resultB = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      permissions: {
        repository_hooks: "write",
        repository_projects: "admin",
      },
    }),
    repos: "all",
  });
  const resultC = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      permissions: {
        repository_hooks: "read",
        repository_projects: "write",
      },
    }),
    repos: "all",
  });
  const resultD = authorizer.authorizeToken({
    consumer: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({
      permissions: {
        repository_hooks: "write",
        repository_projects: "admin",
      },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ❌ Write access to all repos in account-a requested without a role
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ repository_hooks: have write, wanted read
          ✅ repository_projects: have admin, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-write-no-role/a.md"),
  );
  expect(toText(resultB)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ❌ Admin access to all repos in account-a requested without a role
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ repository_hooks: have write, wanted write
          ✅ repository_projects: have admin, wanted admin"
  `);
  await expect(toMarkdown(toMdast(resultB))).toMatchFileSnapshot(
    join(fixturesPath, "denied-write-no-role/b.md"),
  );
  expect(toText(resultC)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ❌ Write access to all repos in account-a requested without a role
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ repository_hooks: have write, wanted read
          ✅ repository_projects: have admin, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultC))).toMatchFileSnapshot(
    join(fixturesPath, "denied-write-no-role/c.md"),
  );
  expect(toText(resultD)).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ❌ Admin access to all repos in account-a requested without a role
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ repository_hooks: have write, wanted write
          ✅ repository_projects: have admin, wanted admin"
  `);
  await expect(toMarkdown(toMdast(resultD))).toMatchFileSnapshot(
    join(fixturesPath, "denied-write-no-role/d.md"),
  );
});

it("allows tokens when permissions use a wildcard pattern", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "*": "write" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write", metadata: "read" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have write, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "allowed-wildcard-perms/a.md"),
  );
});

it("allows literals to escalate above patterns within a single rule", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "*": "read", contents: "write" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write", metadata: "read" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "literal-perm-escalation/a.md"),
  );
});

it("allows literals to de-escalate below patterns within a single rule", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "*": "write", contents: "none" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write", metadata: "read" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted write
          ✅ metadata: have write, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "literal-perm-deescalation/a.md"),
  );
});

it("uses the min access level when multiple patterns match", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "*": "read", "secret_*": "write" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: {
        contents: "read",
        secret_scanning_alerts: "read",
      },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Read access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have read, wanted read
          ✅ secret_scanning_alerts: have read, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "min-access-patterns/a.md"),
  );
});

it("uses the min access level when a broader pattern has higher access", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "*": "write", "secret_*": "read" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: {
        secret_scanning_alerts: "write",
      },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ secret_scanning_alerts: have read, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "min-access-patterns-broader/a.md"),
  );
});

it("skips undefined permission values in rules", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { contents: "write", metadata: undefined },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write", metadata: "read" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ✅ contents: have write, wanted write
          ❌ metadata: have none, wanted read"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "skip-undefined-perms/a.md"),
  );
});

it("doesn't grant permissions when no patterns match", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "organization_*": "write" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "denied-no-patterns-match/a.md"),
  );
});

it("allows a later pattern rule to override a literal rule", async () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { contents: "read" },
      },
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "*": "write" },
      },
    ],
  });

  const resultA = authorizer.authorizeToken({
    consumer: { account: "account-x" },
    tokenDec: createTestTokenDec({
      as: "role-a",
      permissions: { contents: "write" },
    }),
    repos: "all",
  });

  expect(toText(resultA)).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 2 rules:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have read, wanted write
        ✅ Rule #2 gave sufficient access:
          ✅ contents: have write, wanted write"
  `);
  await expect(toMarkdown(toMdast(resultA))).toMatchFileSnapshot(
    join(fixturesPath, "later-pattern-rule-wins/a.md"),
  );
});
