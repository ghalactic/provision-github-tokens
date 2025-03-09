import { expect, it } from "vitest";
import { createTextAuthExplainer } from "../../../../src/token-auth-explainer/text.js";
import { createTokenAuthorizer } from "../../../../src/token-authorizer.js";

const explain = createTextAuthExplainer();

it("allows tokens that should be allowed", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { members: "write", metadata: "read" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { members: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ members: have write, wanted write"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { members: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ members: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { members: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Write access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ members: have write, wanted write"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { members: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Write access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ members: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it("allows tokens when the actual access level is higher than requested", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "write", repository_projects: "admin" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { metadata: "read", repository_projects: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have write, wanted read
          ✅ repository_projects: have admin, wanted write"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { metadata: "read", repository_projects: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Write access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have write, wanted read
          ✅ repository_projects: have admin, wanted write"
  `);
});

it("allows tokens when a later rule allows access that a previous rule denied", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
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
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 2 rules:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have read, wanted write
          ✅ metadata: have read, wanted read
        ✅ Rule #2 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Write access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 2 rules:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have read, wanted write
          ✅ metadata: have read, wanted read
        ✅ Rule #2 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it("allows tokens when a later unrelated rule denies access to the requested permission", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
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
            noRepos: true,
            allRepos: false,
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
            noRepos: true,
            allRepos: false,
            selectedRepos: ["repo-b"],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "none" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Write access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it("allows read-only tokens without a role", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write", metadata: "read" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: undefined,
        account: "account-a",
        repos: [],
        permissions: { contents: "read", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Read access to account-a requested without a role
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted read
          ✅ metadata: have read, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: undefined,
        account: "account-a",
        repos: [],
        permissions: { contents: "read", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Read access to account-a requested without a role
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted read
          ✅ metadata: have read, wanted read"
  `);
});

it("supports rule descriptions", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        description: "<description>",
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "read" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Read access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1: "<description>" gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Read access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1: "<description>" gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
});

it("sorts permissions in the explanation", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "read", contents: "write" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { metadata: "read", contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { metadata: "read", contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Write access to account-a requested with role role-a
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it("doesn't allow tokens for unauthorized consumers", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write", metadata: "read" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-y" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-y was denied access to a token:
      ✅ Read access to account-a requested with role role-a
      ❌ Insufficient access to account-a (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-y", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-x was denied access to a token:
      ✅ Read access to account-a requested with role role-a
      ❌ Insufficient access to account-a (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-y" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y was denied access to a token:
      ✅ Read access to account-a requested with role role-a
      ❌ Insufficient access to account-a (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-y", repo: "repo-y" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y was denied access to a token:
      ✅ Read access to account-a requested with role role-a
      ❌ Insufficient access to account-a (no matching rules)"
  `);
});

it("doesn't allow tokens for unauthorized resource repos", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write", metadata: "read" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: ["repo-y"],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to repos in account-a requested with role role-a
      ❌ Insufficient access to repo account-a/repo-y (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-y",
        repos: [],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to account-y requested with role role-a
      ❌ Insufficient access to account-y (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: ["repo-y"],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Write access to repos in account-a requested with role role-a
      ❌ Insufficient access to repo account-a/repo-y (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-y",
        repos: [],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Write access to account-y requested with role role-a
      ❌ Insufficient access to account-y (no matching rules)"
  `);
});

it("doesn't allow tokens for unauthorized permissions", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "read" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Read access to account-a requested with role role-a
      ❌ Insufficient access to account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Read access to account-a requested with role role-a
      ❌ Insufficient access to account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted read"
  `);
});

it("doesn't allow tokens where only some of the permissions are authorized", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "read" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "read", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Read access to account-a requested with role role-a
      ❌ Insufficient access to account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted read
          ✅ metadata: have read, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "read", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Read access to account-a requested with role role-a
      ❌ Insufficient access to account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted read
          ✅ metadata: have read, wanted read"
  `);
});

it("doesn't allow tokens that are denied by a wildcard rule", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
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
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { metadata: "none" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Read access to account-a requested with role role-a
      ❌ Insufficient access to account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read
        ❌ Rule #2 gave insufficient access:
          ❌ metadata: have none, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Read access to account-a requested with role role-a
      ❌ Insufficient access to account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read
        ❌ Rule #2 gave insufficient access:
          ❌ metadata: have none, wanted read"
  `);
});

it("doesn't allow tokens when the actual access level is lower than requested", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { repository_projects: "write" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { repository_projects: "admin" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Admin access to account-a requested with role role-a
      ❌ Insufficient access to account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ repository_projects: have write, wanted admin"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { repository_projects: "admin" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Admin access to account-a requested with role role-a
      ❌ Insufficient access to account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ repository_projects: have write, wanted admin"
  `);
});

it("doesn't allow tokens for no repos in an account unless a resource rule explicitly allows no repos", () => {
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
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "read" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Read access to account-a requested with role role-a
      ❌ Insufficient access to account-a (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Read access to account-a requested with role role-a
      ❌ Insufficient access to account-a (no matching rules)"
  `);
});

it("doesn't allow tokens when a later rule denies access that a previous rule allowed", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
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
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "read" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to account-a requested with role role-a
      ❌ Insufficient access to account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have read, wanted write"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Write access to account-a requested with role role-a
      ❌ Insufficient access to account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have read, wanted write"
  `);
});

it("doesn't allow tokens when a later rule removes access that a previous rule allowed", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
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
            noRepos: true,
            allRepos: false,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "none" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to account-a requested with role role-a
      ❌ Insufficient access to account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have none, wanted write"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: "role-a",
        account: "account-a",
        repos: [],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ✅ Write access to account-a requested with role role-a
      ❌ Insufficient access to account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have none, wanted write"
  `);
});

it("doesn't allow write tokens if no role is specified", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: true,
            allRepos: false,
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

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: undefined,
        account: "account-a",
        repos: [],
        permissions: {
          repository_hooks: "read",
          repository_projects: "write",
        },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ❌ Write access to account-a requested without a role
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ repository_hooks: have write, wanted read
          ✅ repository_projects: have admin, wanted write"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        role: undefined,
        account: "account-a",
        repos: [],
        permissions: {
          repository_hooks: "write",
          repository_projects: "admin",
        },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ❌ Admin access to account-a requested without a role
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ repository_hooks: have write, wanted write
          ✅ repository_projects: have admin, wanted admin"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: undefined,
        account: "account-a",
        repos: [],
        permissions: {
          repository_hooks: "read",
          repository_projects: "write",
        },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ❌ Write access to account-a requested without a role
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ repository_hooks: have write, wanted read
          ✅ repository_projects: have admin, wanted write"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        role: undefined,
        account: "account-a",
        repos: [],
        permissions: {
          repository_hooks: "write",
          repository_projects: "admin",
        },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ❌ Admin access to account-a requested without a role
      ✅ Sufficient access to account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ repository_hooks: have write, wanted write
          ✅ repository_projects: have admin, wanted admin"
  `);
});
