import { expect, it } from "vitest";
import { createTextProvisionAuthExplainer } from "../../../../src/provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "../../../../src/provision-authorizer.js";

const explain = createTextProvisionAuthExplainer();

it("allows GitHub environment secrets that should be allowed", () => {
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
                  environments: {
                    "env-a": "allow",
                  },
                },
                "account-b-*/repo-b-*": {
                  environments: {
                    "env-b-*": "allow",
                  },
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
        type: "environment",
        target: { account: "account-a", repo: "repo-a", environment: "env-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
      ✅ Can provision to environment env-a in account-a/repo-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-y-1", repo: "repo-y-1" },
        name: "SECRET_A",
        platform: "github",
        type: "environment",
        target: {
          account: "account-b-1",
          repo: "repo-b-1",
          environment: "env-b-1",
        },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-y-1/repo-y-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to environment env-b-1 in account-b-1/repo-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("allows GitHub environment secrets that should be allowed within the requesting repo", () => {
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
                environments: {
                  "env-a": "allow",
                  "env-b-*": "allow",
                },
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
        type: "environment",
        target: { account: "account-a", repo: "repo-a", environment: "env-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can provision to environment env-a in account-a/repo-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-b-1", repo: "repo-b-1" },
        name: "SECRET_A",
        platform: "github",
        type: "environment",
        target: {
          account: "account-b-1",
          repo: "repo-b-1",
          environment: "env-b-1",
        },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to environment env-b-1 in account-b-1/repo-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("allows GitHub environment secrets that should be allowed within the requesting repo even when denied by a repo pattern in the same rule", () => {
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
                environments: {
                  "env-a": "allow",
                  "env-b-*": "allow",
                },
              },
              repos: {
                "*/*": {
                  environments: {
                    "*": "deny",
                  },
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
        type: "environment",
        target: { account: "account-a", repo: "repo-a", environment: "env-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-a/repo-a was allowed to provision secret SECRET_A:
      ✅ Can provision to environment env-a in account-a/repo-a based on 1 rule:
        ✅ Allowed by rule #1"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-b-1", repo: "repo-b-1" },
        name: "SECRET_A",
        platform: "github",
        type: "environment",
        target: {
          account: "account-b-1",
          repo: "repo-b-1",
          environment: "env-b-1",
        },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Repo account-b-1/repo-b-1 was allowed to provision secret SECRET_A:
      ✅ Can provision to environment env-b-1 in account-b-1/repo-b-1 based on 1 rule:
        ✅ Allowed by rule #1"
  `);
});

it("doesn't allow GitHub environment secrets for unauthorized requesters", () => {
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
                  environments: {
                    "env-a": "allow",
                  },
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
        type: "environment",
        target: { account: "account-a", repo: "repo-a", environment: "env-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to environment env-a in account-a/repo-a (no matching rules)"
  `);
});

it("doesn't allow GitHub environment secrets within the requesting repo for unauthorized requesters", () => {
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
                environments: {
                  "env-x": "allow",
                },
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
        type: "environment",
        target: { account: "account-x", repo: "repo-x", environment: "env-x" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-y/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to environment env-x in account-x/repo-x (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-y" },
        name: "SECRET_A",
        platform: "github",
        type: "environment",
        target: { account: "account-x", repo: "repo-x", environment: "env-x" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-y wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to environment env-x in account-x/repo-x (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        platform: "github",
        type: "environment",
        target: { account: "account-x", repo: "repo-y", environment: "env-x" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to environment env-x in account-x/repo-y (no matching rules)"
  `);
  expect(
    explain(
      authorizer.authorizeSecret({
        requester: { account: "account-x", repo: "repo-x" },
        name: "SECRET_A",
        platform: "github",
        type: "environment",
        target: { account: "account-x", repo: "repo-x", environment: "env-y" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to environment env-y in account-x/repo-x (no matching rules)"
  `);
});

it("doesn't allow GitHub environment secrets within the requesting repo when denied even when allowed by a repo pattern in the same rule", () => {
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
                environments: {
                  "env-a": "deny",
                },
              },
              repos: {
                "account-a/repo-a": {
                  environments: {
                    "env-a": "allow",
                  },
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
        type: "environment",
        target: { account: "account-a", repo: "repo-a", environment: "env-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-a/repo-a wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to environment env-a in account-a/repo-a based on 1 rule:
        ❌ Denied by rule #1"
  `);
});

it("doesn't allow GitHub environment secrets when two environment patterns match but one allows and one denies", () => {
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
                  environments: {
                    "*": "deny",
                    "env-a": "allow",
                  },
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
        type: "environment",
        target: { account: "account-a", repo: "repo-a", environment: "env-a" },
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A:
      ❌ Can't provision to environment env-a in account-a/repo-a based on 1 rule:
        ❌ Denied by rule #1"
  `);
});
