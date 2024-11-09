import { expect, it } from "vitest";
import { createTextRepoAuthExplainer } from "../../../../src/token-auth-explainer/text.js";
import { createTokenAuthorizer } from "../../../../src/token-authorizer.js";

const explain = createTextRepoAuthExplainer();

it("allows tokens that should be allowed", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["account-a/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("account-x", "repo-x", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write"
  `);
  expect(
    explain(
      authorizer.authorizeForRepo("account-x", "repo-x", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it("allows tokens when a later rule allows access that a previous rule denied", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["account-a/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "read", metadata: "read" },
        },
        {
          resources: ["account-a/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "write" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("account-x", "repo-x", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Sufficient access to all repos in account-a based on 2 rules:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have read, wanted write
          ✅ metadata: have read, wanted read
        ✅ Rule #2 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it(`allows tokens when a later account-scoped non-"all" rule denies access to a permission that isn't requested`, () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["account-a/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
        {
          resources: ["account-a/repo-*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "none" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("account-x", "repo-x", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Sufficient access to all repos in account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read
        ✅ Rule #2 gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
});

it("allows tokens when a later unrelated rule denies access to the requested permission", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["account-a/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
        {
          resources: ["account-b/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "none" },
        },
        {
          resources: ["account-b/repo-b"],
          consumers: ["account-x/repo-x"],
          permissions: { metadata: "none" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("account-x", "repo-x", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it("doesn't allow tokens for all resource repos unless a resource rule matches all repos in the account", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["account-a/repo-a"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "read" },
        },
        {
          resources: ["account-b/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("account-x", "repo-x", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ❌ Insufficient access to all repos in account-a (no matching rules)"
  `);
});

it(`doesn't allow tokens for all resource repos when a later account-scoped "all" rule denies access that a previous rule allowed`, () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["account-a/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "write" },
        },
        {
          resources: ["account-a/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("account-x", "repo-x", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ❌ Insufficient access to all repos in account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have read, wanted write"
  `);
});

it(`doesn't allow tokens for all resource repos when a later account-scoped "all" rule removes access that a previous rule allowed`, () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["account-a/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "write" },
        },
        {
          resources: ["account-a/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "none" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("account-x", "repo-x", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ❌ Insufficient access to all repos in account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have none, wanted write"
  `);
});

it(`doesn't allow tokens for all resource repos when a later account-scoped non-"all" rule denies access that a previous rule allowed`, () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["account-a/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "write" },
        },
        {
          resources: ["account-a/repo-*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("account-x", "repo-x", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ❌ Insufficient access to all repos in account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have read, wanted write"
  `);
});

it(`doesn't allow tokens for all resource repos when a later account-scoped non-"all" rule removes access that a previous rule allowed`, () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["account-a/*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "write" },
        },
        {
          resources: ["account-a/repo-*"],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "none" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("account-x", "repo-x", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x was denied access to a token:
      ❌ Insufficient access to all repos in account-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have none, wanted write"
  `);
});
