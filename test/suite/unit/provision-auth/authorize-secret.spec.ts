import { expect, it } from "vitest";
import { createTextAuthExplainer } from "../../../../src/provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "../../../../src/provision-authorizer.js";

const explain = createTextAuthExplainer();

it("supports rule descriptions", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          description: "<description>",
          secrets: ["SECRET_A"],
          requesters: ["account-x/repo-x"],
          to: {
            github: {
              account: {},
              accounts: {
                "account-a": {
                  actions: "allow",
                },
              },
              repo: { environments: {} },
              repos: {},
            },
          },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeSecret("account-x/repo-x", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision to GitHub Actions in account-a based on 1 rule:
        ✅ Allowed by rule #1: "<description>""
  `);
});

it("allows secrets when a later rule allows access that a previous rule denied", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-x/repo-x"],
          to: {
            github: {
              account: {},
              accounts: {
                "*": {
                  actions: "deny",
                },
              },
              repo: { environments: {} },
              repos: {
                "*/*": {
                  actions: "deny",
                  environments: {},
                },
              },
            },
          },
        },
        {
          secrets: ["SECRET_A"],
          requesters: ["account-x/repo-x"],
          to: {
            github: {
              account: {},
              accounts: {
                "*": {
                  actions: "allow",
                },
              },
              repo: { environments: {} },
              repos: {
                "*/*": {
                  actions: "allow",
                  environments: {},
                },
              },
            },
          },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeSecret("account-x/repo-x", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision to GitHub Actions in account-a based on 2 rules:
        ❌ Denied by rule #1
        ✅ Allowed by rule #2"
  `);

  expect(
    explain(
      authorizer.authorizeSecret("account-x/repo-x", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
        repo: "repo-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision to GitHub Actions in account-a/repo-a based on 2 rules:
        ❌ Denied by rule #1
        ✅ Allowed by rule #2"
  `);
});

it("doesn't allow secrets when a later rule denies access that a previous rule allowed", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-x/repo-x"],
          to: {
            github: {
              account: {},
              accounts: {
                "*": {
                  actions: "allow",
                },
              },
              repo: { environments: {} },
              repos: {
                "*/*": {
                  actions: "allow",
                  environments: {},
                },
              },
            },
          },
        },
        {
          secrets: ["SECRET_A"],
          requesters: ["account-x/repo-x"],
          to: {
            github: {
              account: {},
              accounts: {
                "*": {
                  actions: "deny",
                },
              },
              repo: { environments: {} },
              repos: {
                "*/*": {
                  actions: "deny",
                  environments: {},
                },
              },
            },
          },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeSecret("account-x/repo-x", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to GitHub Actions in account-a based on 2 rules:
        ✅ Allowed by rule #1
        ❌ Denied by rule #2"
  `);

  expect(
    explain(
      authorizer.authorizeSecret("account-x/repo-x", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
        repo: "repo-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to GitHub Actions in account-a/repo-a based on 2 rules:
        ✅ Allowed by rule #1
        ❌ Denied by rule #2"
  `);
});

it("doesn't allow secrets when no rule matches the secret name", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-x/repo-x"],
          to: {
            github: {
              account: {},
              accounts: {
                "*": {
                  actions: "allow",
                },
              },
              repo: { environments: {} },
              repos: {
                "*/*": {
                  actions: "allow",
                  environments: {},
                },
              },
            },
          },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeSecret("account-x/repo-x", {
        name: "SECRET_X",
        platform: "github",
        type: "actions",
        account: "account-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_X:
      ❌ Can't provision to GitHub Actions in account-a (no matching rules)"
  `);
});
