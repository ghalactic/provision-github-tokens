import { expect, it } from "vitest";
import { createTextAuthExplainer } from "../../../../src/token-auth-explainer/text.js";
import { createTokenAuthorizer } from "../../../../src/token-authorizer.js";
import { throws } from "../../../error.js";

const explain = createTextAuthExplainer();

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
      authorizer.authorizeForAccount("account-x", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { metadata: "read" },
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
      authorizer.authorizeForAccount("account-y", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { metadata: "read" },
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
      authorizer.authorizeForRepo("account-x/repo-x", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { metadata: "read" },
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
      authorizer.authorizeForRepo("account-y/repo-y", {
        role: undefined,
        account: "account-a",
        repos: "all",
        permissions: { metadata: "read" },
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

it("throws if the requested permissions are empty", () => {
  const authorizer = createTokenAuthorizer({ rules: [] });

  expect(
    throws(() =>
      authorizer.authorizeForAccount("account-x", {
        role: undefined,
        account: "account-a",
        repos: ["repo-a"],
        permissions: {},
      }),
    ),
  ).toMatchInlineSnapshot(`"No permissions requested"`);
  expect(
    throws(() =>
      authorizer.authorizeForAccount("account-x", {
        role: undefined,
        account: "account-a",
        repos: ["repo-a"],
        permissions: { contents: undefined, metadata: "none" },
      }),
    ),
  ).toMatchInlineSnapshot(`"No permissions requested"`);
  expect(
    throws(() =>
      authorizer.authorizeForRepo("account-x/repo-x", {
        role: undefined,
        account: "account-a",
        repos: ["repo-a"],
        permissions: {},
      }),
    ),
  ).toMatchInlineSnapshot(`"No permissions requested"`);
  expect(
    throws(() =>
      authorizer.authorizeForRepo("account-x/repo-x", {
        role: undefined,
        account: "account-a",
        repos: ["repo-a"],
        permissions: { contents: undefined, metadata: "none" },
      }),
    ),
  ).toMatchInlineSnapshot(`"No permissions requested"`);
});
