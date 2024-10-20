import { expect, it } from "vitest";
import { createTextRepoAuthExplainer } from "../../../../src/token-auth-explainer/text.js";
import { createTokenAuthorizer } from "../../../../src/token-authorizer.js";

const explain = createTextRepoAuthExplainer();

it("allows tokens that should be allowed", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repositories: [
        {
          resources: ["owner-a/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepository("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repositories: "all",
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to all repos in owner-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write"
  `);
  expect(
    explain(
      authorizer.authorizeForRepository("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repositories: "all",
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to all repos in owner-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it("allows tokens when a later rule allows access that a previous rule denied", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repositories: [
        {
          resources: ["owner-a/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "read", metadata: "read" },
        },
        {
          resources: ["owner-a/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepository("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repositories: "all",
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to all repos in owner-a based on 2 rules:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have read, wanted write
          ✅ metadata: have read, wanted read
        ✅ Rule #2 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it(`allows tokens when a later owner-scoped non-"all" rule denies access to a permission that isn't requested`, () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repositories: [
        {
          resources: ["owner-a/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
        {
          resources: ["owner-a/repo-*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "none" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepository("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repositories: "all",
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to all repos in owner-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read
        ✅ Rule #2 gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
});

it("allows tokens when a later unrelated rule denies access to the requested permission", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repositories: [
        {
          resources: ["owner-a/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
        {
          resources: ["owner-b/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "none" },
        },
        {
          resources: ["owner-b/repo-b"],
          consumers: ["owner-x/repo-x"],
          permissions: { metadata: "none" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepository("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repositories: "all",
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to all repos in owner-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it("doesn't allow tokens for all resource repos unless a resource rule matches all repos in the owner", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repositories: [
        {
          resources: ["owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "read" },
        },
        {
          resources: ["owner-b/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepository("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repositories: "all",
        permissions: { contents: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to all repos in owner-a (no matching rules)"
  `);
});

it(`doesn't allow tokens for all resource repos when a later owner-scoped "all" rule denies access that a previous rule allowed`, () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repositories: [
        {
          resources: ["owner-a/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write" },
        },
        {
          resources: ["owner-a/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepository("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repositories: "all",
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to all repos in owner-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have read, wanted write"
  `);
});

it(`doesn't allow tokens for all resource repos when a later owner-scoped "all" rule removes access that a previous rule allowed`, () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repositories: [
        {
          resources: ["owner-a/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write" },
        },
        {
          resources: ["owner-a/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "none" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepository("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repositories: "all",
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to all repos in owner-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have none, wanted write"
  `);
});

it(`doesn't allow tokens for all resource repos when a later owner-scoped non-"all" rule denies access that a previous rule allowed`, () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repositories: [
        {
          resources: ["owner-a/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write" },
        },
        {
          resources: ["owner-a/repo-*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepository("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repositories: "all",
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to all repos in owner-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have read, wanted write"
  `);
});

it(`doesn't allow tokens for all resource repos when a later owner-scoped non-"all" rule removes access that a previous rule allowed`, () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repositories: [
        {
          resources: ["owner-a/*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write" },
        },
        {
          resources: ["owner-a/repo-*"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "none" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepository("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repositories: "all",
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to all repos in owner-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have none, wanted write"
  `);
});
