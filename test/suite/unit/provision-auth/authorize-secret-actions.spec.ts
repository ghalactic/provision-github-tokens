import { expect, it } from "vitest";
import { createTextAuthExplainer } from "../../../../src/provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "../../../../src/provision-authorizer.js";

const explain = createTextAuthExplainer();

it("allows GitHub Actions account secrets that should be allowed", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-x/repo-x", "account-y-*/repo-y-*"],
          to: {
            github: {
              account: {},
              accounts: {
                "account-a": {
                  actions: "allow",
                },
                "account-b-*": {
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
      ✅ Can provision to Actions in account-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret("account-y-1/repo-y-1", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-b-1",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-y-1/repo-y-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to Actions in account-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Actions account secrets that should be allowed within the requesting account", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-a/repo-a", "account-b-*/repo-b-*"],
          to: {
            github: {
              account: {
                actions: "allow",
              },
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
      authorizer.authorizeSecret("account-a/repo-a", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can provision to Actions in account-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret("account-b-1/repo-b-1", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-b-1",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to Actions in account-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Actions account secrets that should be allowed within the requesting account even when denied by an account pattern in the same rule", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-a/repo-a"],
          to: {
            github: {
              account: {
                actions: "allow",
              },
              accounts: {
                "account-a": {
                  actions: "deny",
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
      authorizer.authorizeSecret("account-a/repo-a", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can provision to Actions in account-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Actions repo secrets that should be allowed", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-x/repo-x", "account-y-*/repo-y-*"],
          to: {
            github: {
              account: {},
              accounts: {},
              repo: { environments: {} },
              repos: {
                "account-a/repo-a": {
                  actions: "allow",
                  environments: {},
                },
                "account-b-*/repo-b-*": {
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
        repo: "repo-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision to Actions in account-a/repo-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret("account-y-1/repo-y-1", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-b-1",
        repo: "repo-b-1",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-y-1/repo-y-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to Actions in account-b-1/repo-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Actions repo secrets that should be allowed within the requesting repo", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-a/repo-a", "account-b-*/repo-b-*"],
          to: {
            github: {
              account: {},
              accounts: {},
              repo: {
                actions: "allow",
                environments: {},
              },
              repos: {},
            },
          },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeSecret("account-a/repo-a", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
        repo: "repo-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can provision to Actions in account-a/repo-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret("account-b-1/repo-b-1", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-b-1",
        repo: "repo-b-1",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to Actions in account-b-1/repo-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Actions repo secrets that should be allowed within the requesting repo even when denied by a repo pattern in the same rule", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-a/repo-a", "account-b-*/repo-b-*"],
          to: {
            github: {
              account: {},
              accounts: {},
              repo: {
                actions: "allow",
                environments: {},
              },
              repos: {
                "account-a/repo-a": {
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
      authorizer.authorizeSecret("account-a/repo-a", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
        repo: "repo-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can provision to Actions in account-a/repo-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret("account-b-1/repo-b-1", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-b-1",
        repo: "repo-b-1",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to Actions in account-b-1/repo-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("doesn't allow GitHub Actions account secrets for unauthorized requesters", () => {
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
      authorizer.authorizeSecret("account-y/repo-y", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Actions in account-a (no matching rules)"
  `);
});

it("doesn't allow GitHub Actions account secrets within the requesting account for unauthorized requesters", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-x/repo-x"],
          to: {
            github: {
              account: {
                actions: "allow",
              },
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
      authorizer.authorizeSecret("account-y/repo-y", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-x",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Actions in account-x (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeSecret("account-x/repo-y", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-x",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Actions in account-x (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeSecret("account-x/repo-x", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-y",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Actions in account-y (no matching rules)"
  `);
});

it("doesn't allow GitHub Actions account secrets within the requesting account when denied even when allowed by an account pattern in the same rule", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-a/repo-a"],
          to: {
            github: {
              account: {
                actions: "deny",
              },
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
      authorizer.authorizeSecret("account-a/repo-a", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Actions in account-a based on 1 rule:
        ❌ Denied by rule #1"
  `);
});

it("doesn't allow GitHub Actions repo secrets for unauthorized requesters", () => {
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
      authorizer.authorizeSecret("account-y/repo-y", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
        repo: "repo-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Actions in account-a/repo-a (no matching rules)"
  `);
});

it("doesn't allow GitHub Actions repo secrets within the requesting repo for unauthorized requesters", () => {
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
              repo: {
                actions: "allow",
                environments: {},
              },
              repos: {},
            },
          },
        },
      ],
    },
  });

  expect(
    explain(
      authorizer.authorizeSecret("account-y/repo-y", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-x",
        repo: "repo-x",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Actions in account-x/repo-x (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeSecret("account-x/repo-y", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-x",
        repo: "repo-x",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Actions in account-x/repo-x (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeSecret("account-x/repo-x", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-x",
        repo: "repo-y",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Actions in account-x/repo-y (no matching rules)"
  `);
});

it("doesn't allow GitHub Actions repo secrets within the requesting repo when denied even when allowed by a repo pattern in the same rule", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-a/repo-a"],
          to: {
            github: {
              account: {},
              accounts: {},
              repo: {
                actions: "deny",
                environments: {},
              },
              repos: {
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
      authorizer.authorizeSecret("account-a/repo-a", {
        name: "SECRET_A",
        platform: "github",
        type: "actions",
        account: "account-a",
        repo: "repo-a",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Actions in account-a/repo-a based on 1 rule:
        ❌ Denied by rule #1"
  `);
});
