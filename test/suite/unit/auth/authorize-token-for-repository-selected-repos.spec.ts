import { expect, it } from "vitest";
import { createTextRepoAuthExplainer } from "../../../../src/token-auth-explainer/text.js";
import { createTokenAuthorizer } from "../../../../src/token-authorizer.js";

const explain = createTextRepoAuthExplainer();

it("allows tokens that should be allowed", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-a", "owner-a/repo-b"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to repo owner-a/repo-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write"
  `);
  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-b"],
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to repo owner-a/repo-b based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a", "repo-b"],
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to repo owner-a/repo-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read
      ✅ Sufficient access to repo owner-a/repo-b based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it("allows tokens when allowed by a wildcard rule", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-*", "owner-*/repo-b"],
          consumers: ["owner-x/repo-x"],
          permissions: { metadata: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to repo owner-a/repo-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-b",
        repos: ["repo-b"],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to repo owner-b/repo-b based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
});

it("allows tokens when the actual access level is higher than requested", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { metadata: "write", repository_projects: "admin" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { metadata: "read", repository_projects: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to repo owner-a/repo-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have write, wanted read
          ✅ repository_projects: have admin, wanted write"
  `);
});

it("allows tokens when a later rule allows access that a previous rule denied", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "read", metadata: "read" },
        },
        {
          resources: ["owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { contents: "write", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to repo owner-a/repo-a based on 2 rules:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have read, wanted write
          ✅ metadata: have read, wanted read
        ✅ Rule #2 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it("supports rule descriptions", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          description: "<description>",
          resources: ["owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { metadata: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to repo owner-a/repo-a based on 1 rule:
        ✅ Rule #1: "<description>" gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
});

it("sorts repos and permissions in the explanation", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-b", "owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { metadata: "read", contents: "write" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-b", "repo-a"],
        permissions: { metadata: "read", contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo owner-x/repo-x was allowed access to a token:
      ✅ Sufficient access to repo owner-a/repo-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read
      ✅ Sufficient access to repo owner-a/repo-b based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it("doesn't allow tokens for unauthorized consumer repos", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-a", "owner-a/repo-b"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-y", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-y/repo-x was denied access to a token:
      ❌ Insufficient access to repo owner-a/repo-a (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-y", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-y was denied access to a token:
      ❌ Insufficient access to repo owner-a/repo-a (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeForRepo("owner-y", "repo-y", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-y/repo-y was denied access to a token:
      ❌ Insufficient access to repo owner-a/repo-a (no matching rules)"
  `);
});

it("doesn't allow tokens for unauthorized resource repos", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-a", "owner-a/repo-b"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-y"],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to repo owner-a/repo-y (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-y",
        repos: ["repo-a"],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to repo owner-y/repo-a (no matching rules)"
  `);
});

it("doesn't allow tokens where only some of the resources are authorized", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-a", "owner-a/repo-b"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a", "repo-b", "repo-y"],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ✅ Sufficient access to repo owner-a/repo-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
      ✅ Sufficient access to repo owner-a/repo-b based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
      ❌ Insufficient access to repo owner-a/repo-y (no matching rules)"
  `);
});

it("doesn't allow tokens for unauthorized permissions", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { metadata: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { contents: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to repo owner-a/repo-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted read"
  `);
});

it("doesn't allow tokens where only some of the permissions are authorized", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { metadata: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { contents: "read", metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to repo owner-a/repo-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted read
          ✅ metadata: have read, wanted read"
  `);
});

it("doesn't allow tokens that are denied by a wildcard rule", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-a", "owner-b/repo-b"],
          consumers: ["owner-x/repo-x"],
          permissions: { metadata: "read" },
        },
        {
          resources: ["owner-a/repo-*", "owner-*/repo-b"],
          consumers: ["owner-x/repo-x"],
          permissions: { metadata: "none" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to repo owner-a/repo-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read
        ❌ Rule #2 gave insufficient access:
          ❌ metadata: have none, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-b",
        repos: ["repo-b"],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to repo owner-b/repo-b based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read
        ❌ Rule #2 gave insufficient access:
          ❌ metadata: have none, wanted read"
  `);
});

it("doesn't allow tokens when the actual access level is lower than requested", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { repository_projects: "write" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { repository_projects: "admin" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to repo owner-a/repo-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ repository_projects: have write, wanted admin"
  `);
});

it("doesn't allow tokens when a later rule denies access that a previous rule allowed", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write" },
        },
        {
          resources: ["owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "read" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { contents: "write" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to repo owner-a/repo-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have read, wanted write"
  `);
});

it("doesn't allow tokens when a later rule removes access that a previous rule allowed", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repos: [
        {
          resources: ["owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "read" },
        },
        {
          resources: ["owner-a/repo-a"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "none" },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { contents: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo owner-x/repo-x was denied access to a token:
      ❌ Insufficient access to repo owner-a/repo-a based on 2 rules:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have read, wanted read
        ❌ Rule #2 gave insufficient access:
          ❌ contents: have none, wanted read"
  `);
});
