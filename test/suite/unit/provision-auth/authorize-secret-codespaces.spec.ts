import { expect, it } from "vitest";
import { createTextAuthExplainer } from "../../../../src/provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "../../../../src/provision-authorizer.js";

const explain = createTextAuthExplainer();

it("allows GitHub Codespaces account secrets that should be allowed", () => {
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
                  codespaces: "allow",
                },
                "account-b-*": {
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
        platform: "github",
        type: "codespaces",
        target: { account: "account-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision to Codespaces in account-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-y-1", repo: "repo-y-1" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-b-1" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-y-1/repo-y-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to Codespaces in account-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Codespaces account secrets that should be allowed within the requesting account", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-a/repo-a", "account-b-*/repo-b-*"],
          to: {
            github: {
              account: {
                codespaces: "allow",
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
      authorizer.authorizeSecret({
        requester: { account: "account-a", repo: "repo-a" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can provision to Codespaces in account-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-b-1", repo: "repo-b-1" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-b-1" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to Codespaces in account-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Codespaces account secrets that should be allowed within the requesting account even when denied by an account pattern in the same rule", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-a/repo-a"],
          to: {
            github: {
              account: {
                codespaces: "allow",
              },
              accounts: {
                "account-a": {
                  codespaces: "deny",
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
        requester: { account: "account-a", repo: "repo-a" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can provision to Codespaces in account-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Codespaces repo secrets that should be allowed", () => {
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
                  codespaces: "allow",
                  environments: {},
                },
                "account-b-*/repo-b-*": {
                  codespaces: "allow",
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
        platform: "github",
        type: "codespaces",
        target: { account: "account-a", repo: "repo-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision to Codespaces in account-a/repo-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-y-1", repo: "repo-y-1" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-b-1", repo: "repo-b-1" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-y-1/repo-y-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to Codespaces in account-b-1/repo-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Codespaces repo secrets that should be allowed within the requesting repo", () => {
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
                codespaces: "allow",
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
      authorizer.authorizeSecret({
        requester: { account: "account-a", repo: "repo-a" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-a", repo: "repo-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can provision to Codespaces in account-a/repo-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-b-1", repo: "repo-b-1" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-b-1", repo: "repo-b-1" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to Codespaces in account-b-1/repo-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("allows GitHub Codespaces repo secrets that should be allowed within the requesting repo even when denied by a repo pattern in the same rule", () => {
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
                codespaces: "allow",
                environments: {},
              },
              repos: {
                "account-a/repo-a": {
                  codespaces: "deny",
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
        requester: { account: "account-a", repo: "repo-a" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-a", repo: "repo-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can provision to Codespaces in account-a/repo-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-b-1", repo: "repo-b-1" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-b-1", repo: "repo-b-1" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to Codespaces in account-b-1/repo-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("doesn't allow GitHub Codespaces account secrets for unauthorized requesters", () => {
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
        requester: { account: "account-y", repo: "repo-y" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Codespaces in account-a (no matching rules)"
  `);
});

it("doesn't allow GitHub Codespaces account secrets within the requesting account for unauthorized requesters", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-x/repo-x"],
          to: {
            github: {
              account: {
                codespaces: "allow",
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
      authorizer.authorizeSecret({
        requester: { account: "account-y", repo: "repo-y" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-x" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Codespaces in account-x (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-y" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-x" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Codespaces in account-x (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-y" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Codespaces in account-y (no matching rules)"
  `);
});

it("doesn't allow GitHub Codespaces account secrets within the requesting account when denied even when allowed by an account pattern in the same rule", () => {
  const authorizer = createProvisionAuthorizer({
    rules: {
      secrets: [
        {
          secrets: ["SECRET_A"],
          requesters: ["account-a/repo-a"],
          to: {
            github: {
              account: {
                codespaces: "deny",
              },
              accounts: {
                "account-a": {
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
        requester: { account: "account-a", repo: "repo-a" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Codespaces in account-a based on 1 rule:
        ❌ Denied by rule #1"
  `);
});

it("doesn't allow GitHub Codespaces repo secrets for unauthorized requesters", () => {
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
                  codespaces: "allow",
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
        requester: { account: "account-y", repo: "repo-y" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-a", repo: "repo-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Codespaces in account-a/repo-a (no matching rules)"
  `);
});

it("doesn't allow GitHub Codespaces repo secrets within the requesting repo for unauthorized requesters", () => {
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
                codespaces: "allow",
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
      authorizer.authorizeSecret({
        requester: { account: "account-y", repo: "repo-y" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-x", repo: "repo-x" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Codespaces in account-x/repo-x (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-y" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-x", repo: "repo-x" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Codespaces in account-x/repo-x (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-x", repo: "repo-y" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Codespaces in account-x/repo-y (no matching rules)"
  `);
});

it("doesn't allow GitHub Codespaces repo secrets within the requesting repo when denied even when allowed by a repo pattern in the same rule", () => {
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
                codespaces: "deny",
                environments: {},
              },
              repos: {
                "account-a/repo-a": {
                  codespaces: "allow",
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
        requester: { account: "account-a", repo: "repo-a" },
        name: "SECRET_A",
        platform: "github",
        type: "codespaces",
        target: { account: "account-a", repo: "repo-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to Codespaces in account-a/repo-a based on 1 rule:
        ❌ Denied by rule #1"
  `);
});
