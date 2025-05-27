import { expect, it } from "vitest";
import { createTextProvisionAuthExplainer } from "../../../../src/provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "../../../../src/provision-authorizer.js";

const explain = createTextProvisionAuthExplainer();

it("supports multiple secrets per rule", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A", "SECRET_B"],
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
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision token to GitHub Actions secret in account-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_B",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_B:
      ✅ Can provision token to GitHub Actions secret in account-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("supports multiple targets in requests", () => {
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
                "account-a": {
                  actions: "allow",
                  codespaces: "allow",
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
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a" },
          },
          {
            platform: "github",
            type: "codespaces",
            target: { account: "account-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision token to GitHub Actions secret in account-a based on 1 rule:
        ✅ Allowed by rule #1
      ✅ Can provision token to GitHub Codespaces secret in account-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("supports wildcards in secret names", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_*"],
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
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision token to GitHub Actions secret in account-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_B",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_B:
      ✅ Can provision token to GitHub Actions secret in account-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

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
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision token to GitHub Actions secret in account-a based on 1 rule:
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
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision token to GitHub Actions secret in account-a based on 2 rules:
        ❌ Denied by rule #1
        ✅ Allowed by rule #2"
  `);

  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a", repo: "repo-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision token to GitHub Actions secret in account-a/repo-a based on 2 rules:
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
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision token to GitHub Actions secret in account-a based on 2 rules:
        ✅ Allowed by rule #1
        ❌ Denied by rule #2"
  `);

  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a", repo: "repo-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision token to GitHub Actions secret in account-a/repo-a based on 2 rules:
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
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_X",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_X:
      ❌ Can't provision token to GitHub Actions secret in account-a (no matching rules)"
  `);
});

it("doesn't allow secrets when two account patterns match but one allows and one denies", () => {
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
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision token to GitHub Actions secret in account-a based on 1 rule:
        ❌ Denied by rule #1"
  `);
});

it("doesn't allow secrets when two repo patterns match but one allows and one denies", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-x/repo-x"],
          to: {
            github: {
              account: {},
              accounts: {},
              repo: { environments: {} },
              repos: {
                "*/*": {
                  actions: "deny",
                  environments: {},
                },
                "account-a/repo-a": {
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
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a", repo: "repo-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision token to GitHub Actions secret in account-a/repo-a based on 1 rule:
        ❌ Denied by rule #1"
  `);
});

it("doesn't allow secrets when some targets aren't allowed", () => {
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
                "account-a": {
                  actions: "allow",
                  codespaces: "deny",
                  dependabot: "allow",
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
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        to: [
          {
            platform: "github",
            type: "actions",
            target: { account: "account-a" },
          },
          {
            platform: "github",
            type: "codespaces",
            target: { account: "account-a" },
          },
          {
            platform: "github",
            type: "dependabot",
            target: { account: "account-a" },
          },
        ],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ✅ Can provision token to GitHub Actions secret in account-a based on 1 rule:
        ✅ Allowed by rule #1
      ❌ Can't provision token to GitHub Codespaces secret in account-a based on 1 rule:
        ❌ Denied by rule #1
      ✅ Can provision token to Dependabot secret in account-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("doesn't allow secrets when no targets are specified", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-x/repo-x"],
          to: {
            github: {
              account: {},
              accounts: {},
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
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        to: [],
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ No targets specified"
  `);
});
