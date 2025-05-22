import { expect, it } from "vitest";
import { createTextTokenAuthExplainer } from "../../../../src/token-auth-explainer/text.js";
import { createTokenAuthorizer } from "../../../../src/token-authorizer.js";
import type { TokenRequest } from "../../../../src/token-request.js";
import { throws } from "../../../error.js";

const explain = createTextTokenAuthExplainer();

it("supports wildcard account consumers", () => {
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
        consumers: ["account-*"],
        permissions: { metadata: "read" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        tokenDec: {
          shared: false,
          as: undefined,
          account: "account-a",
          repos: "all",
          permissions: { metadata: "read" },
        },
        repos: "all",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Read access to all repos in account-a requested without a role
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-y" },
        tokenDec: {
          shared: false,
          as: undefined,
          account: "account-a",
          repos: "all",
          permissions: { metadata: "read" },
        },
        repos: "all",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-y was allowed access to a token:
      ✅ Read access to all repos in account-a requested without a role
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
});

it("supports wildcard repo consumers", () => {
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
        consumers: ["account-*/repo-*"],
        permissions: { metadata: "read" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        tokenDec: {
          shared: false,
          as: undefined,
          account: "account-a",
          repos: "all",
          permissions: { metadata: "read" },
        },
        repos: "all",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed access to a token:
      ✅ Read access to all repos in account-a requested without a role
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-y", repo: "repo-y" },
        tokenDec: {
          shared: false,
          as: undefined,
          account: "account-a",
          repos: "all",
          permissions: { metadata: "read" },
        },
        repos: "all",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-y/repo-y was allowed access to a token:
      ✅ Read access to all repos in account-a requested without a role
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ metadata: have read, wanted read"
  `);
});

it("returns the same result for equivalent requests", () => {
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

  const requestA: TokenRequest = {
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: ["repo-a", "repo-b"],
      permissions: { contents: "write", metadata: "read" },
    },
    repos: ["repo-a", "repo-b"],
  };
  const requestB: TokenRequest = {
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: ["repo-b", "repo-a"],
      permissions: { metadata: "read", contents: "write" },
    },
    repos: ["repo-b", "repo-a"],
  };

  expect(authorizer.authorizeToken(requestA)).toBe(
    authorizer.authorizeToken(requestB),
  );
});

it("returns a different result for non-equivalent requests", () => {
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

  const requestA: TokenRequest = {
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: "all",
      permissions: { contents: "write", metadata: "read" },
    },
    repos: "all",
  };
  const requestB: TokenRequest = {
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: "all",
      permissions: { metadata: "read", contents: "read" },
    },
    repos: "all",
  };

  expect(authorizer.authorizeToken(requestA)).not.toBe(
    authorizer.authorizeToken(requestB),
  );
});

it("throws if the requested permissions are empty", () => {
  const authorizer = createTokenAuthorizer({ rules: [] });

  expect(
    throws(() =>
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        tokenDec: {
          shared: false,
          as: undefined,
          account: "account-a",
          repos: ["repo-a"],
          permissions: {},
        },
        repos: ["repo-a"],
      }),
    ),
  ).toMatchInlineSnapshot(`"No permissions requested"`);
  expect(
    throws(() =>
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        tokenDec: {
          shared: false,
          as: undefined,
          account: "account-a",
          repos: ["repo-a"],
          permissions: { contents: undefined, metadata: "none" },
        },
        repos: ["repo-a"],
      }),
    ),
  ).toMatchInlineSnapshot(`"No permissions requested"`);
  expect(
    throws(() =>
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        tokenDec: {
          shared: false,
          as: undefined,
          account: "account-a",
          repos: ["repo-a"],
          permissions: {},
        },
        repos: ["repo-a"],
      }),
    ),
  ).toMatchInlineSnapshot(`"No permissions requested"`);
  expect(
    throws(() =>
      authorizer.authorizeToken({
        consumer: { account: "account-x", repo: "repo-x" },
        tokenDec: {
          shared: false,
          as: undefined,
          account: "account-a",
          repos: ["repo-a"],
          permissions: { contents: undefined, metadata: "none" },
        },
        repos: ["repo-a"],
      }),
    ),
  ).toMatchInlineSnapshot(`"No permissions requested"`);
});
