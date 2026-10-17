import { expect, it } from "vitest";
import {
  createTestAccountProvisionRequestTarget,
  createTestProvisionRequest,
} from "../test/provision-request.js";
import { createTestTokenAuthorizer } from "../test/token-authorizer.js";
import { createTestTokenRequestFactory } from "../test/token-request.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";
import type { AccountSecretVisibility } from "./provision-request.js";
import type { ProviderConfigGitHubAccountSecretTypes } from "./type/provision-rule.js";

// FIXME: Rework these tests once the explainer slice lands. They must assert the
// text explainer with inline snapshots, and the Markdown explainer with file
// snapshots, just like the other provision authorizer specs. Asserting
// `isAllowed` on its own is not good enough.

it.each<
  [
    name: string,
    visibility: AccountSecretVisibility,
    types: ProviderConfigGitHubAccountSecretTypes,
    expected: boolean,
  ]
>([
  [
    "allows an `all` account secret when allRepos is allowed",
    "all",
    { actions: { allRepos: "allow" } },
    true,
  ],
  [
    "denies an `all` account secret when allRepos is denied",
    "all",
    { actions: { allRepos: "deny" } },
    false,
  ],
  [
    "denies an `all` account secret when allRepos is unspecified",
    "all",
    { actions: {} },
    false,
  ],
  [
    "allows a `private` account secret when privateRepos is allowed",
    "private",
    { actions: { privateRepos: "allow" } },
    true,
  ],
  [
    "denies a `private` account secret when privateRepos is denied",
    "private",
    { actions: { privateRepos: "deny" } },
    false,
  ],
  [
    "denies a `private` account secret when privateRepos is unspecified",
    "private",
    { actions: {} },
    false,
  ],
  [
    "allows an explicitly empty account secret when noRepos is allowed",
    { patterns: [], repos: [] },
    { actions: { noRepos: "allow" } },
    true,
  ],
  [
    "denies an explicitly empty account secret when noRepos is denied",
    { patterns: [], repos: [] },
    { actions: { noRepos: "deny" } },
    false,
  ],
  [
    "denies an explicitly empty account secret when noRepos is unspecified",
    { patterns: [], repos: [] },
    { actions: {} },
    false,
  ],
])("%s", (name, visibility, types, expected) => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  expect(
    authorizer.authorizeSecret(
      createTestProvisionRequest({
        to: [
          createTestAccountProvisionRequestTarget(
            "actions",
            "account-a",
            visibility,
          ),
        ],
      }),
    ).isAllowed,
  ).toBe(expected);
});

it("allows a selected-repo account secret when the gate and every repo allow it", () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "allow" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-*": {
                    visibility: "private",
                    types: { actions: "allow", environments: {} },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  expect(
    authorizer.authorizeSecret(
      createTestProvisionRequest({
        to: [
          createTestAccountProvisionRequestTarget("actions", "account-a", {
            patterns: ["repo-*"],
            repos: [
              {
                ref: { account: "account-a", repo: "repo-x" },
                id: 1,
                visibility: "private",
              },
              {
                ref: { account: "account-a", repo: "repo-y" },
                id: 2,
                visibility: "private",
              },
            ],
          }),
        ],
      }),
    ).isAllowed,
  ).toBe(true);
});

it("denies a selected-repo account secret when the gate denies it", () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "deny" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-*": {
                    visibility: "private",
                    types: { actions: "allow", environments: {} },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  expect(
    authorizer.authorizeSecret(
      createTestProvisionRequest({
        to: [
          createTestAccountProvisionRequestTarget("actions", "account-a", {
            patterns: ["repo-*"],
            repos: [
              {
                ref: { account: "account-a", repo: "repo-x" },
                id: 1,
                visibility: "private",
              },
            ],
          }),
        ],
      }),
    ).isAllowed,
  ).toBe(false);
});

it("denies a selected-repo account secret when any single repo is denied", () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "allow" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-x": {
                    visibility: "private",
                    types: { actions: "allow", environments: {} },
                  },
                  "account-a/repo-y": {
                    visibility: "private",
                    types: { actions: "deny", environments: {} },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  expect(
    authorizer.authorizeSecret(
      createTestProvisionRequest({
        to: [
          createTestAccountProvisionRequestTarget("actions", "account-a", {
            patterns: ["repo-*"],
            repos: [
              {
                ref: { account: "account-a", repo: "repo-x" },
                id: 1,
                visibility: "private",
              },
              {
                ref: { account: "account-a", repo: "repo-y" },
                id: 2,
                visibility: "private",
              },
            ],
          }),
        ],
      }),
    ).isAllowed,
  ).toBe(false);
});

it("denies a selected-repo account secret when a named repo matches no rule", () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "allow" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-x": {
                    visibility: "private",
                    types: { actions: "allow", environments: {} },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  expect(
    authorizer.authorizeSecret(
      createTestProvisionRequest({
        to: [
          createTestAccountProvisionRequestTarget("actions", "account-a", {
            patterns: ["repo-*"],
            repos: [
              {
                ref: { account: "account-a", repo: "repo-x" },
                id: 1,
                visibility: "private",
              },
              {
                ref: { account: "account-a", repo: "repo-z" },
                id: 3,
                visibility: "private",
              },
            ],
          }),
        ],
      }),
    ).isAllowed,
  ).toBe(false);
});

it("denies a selected-repo account secret when a repo's visibility is excluded", () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "allow" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-*": {
                    visibility: "private",
                    types: { actions: "allow", environments: {} },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  expect(
    authorizer.authorizeSecret(
      createTestProvisionRequest({
        to: [
          createTestAccountProvisionRequestTarget("actions", "account-a", {
            patterns: ["repo-*"],
            repos: [
              {
                ref: { account: "account-a", repo: "repo-x" },
                id: 1,
                visibility: "public",
              },
            ],
          }),
        ],
      }),
    ).isAllowed,
  ).toBe(false);
});

it("denies a selected-repo account secret whose patterns matched no repos", () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: {
                  types: {
                    actions: { selectedRepos: "allow", noRepos: "allow" },
                  },
                },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  expect(
    authorizer.authorizeSecret(
      createTestProvisionRequest({
        to: [
          createTestAccountProvisionRequestTarget("actions", "account-a", {
            patterns: ["team-*"],
            repos: [],
          }),
        ],
      }),
    ).isAllowed,
  ).toBe(false);
});

it("skips rules that don't match the secret name or the requester", () => {
  const authorizer = createProvisionAuthorizer(
    createTestTokenRequestFactory(),
    createTestTokenAuthorizer({ metadata: "read" }),
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "allow" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-*": {
                    visibility: "private",
                    types: { actions: "allow", environments: {} },
                  },
                },
              },
            },
          },
          {
            secrets: ["OTHER_SECRET"],
            requesters: ["account-a/repo-a"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "deny" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-*": {
                    visibility: "private",
                    types: { actions: "deny", environments: {} },
                  },
                },
              },
            },
          },
          {
            secrets: ["SECRET_A"],
            requesters: ["other-account/repo"],
            to: {
              github: {
                account: { types: { actions: { selectedRepos: "deny" } } },
                accounts: {},
                repo: { visibility: "private", types: { environments: {} } },
                repos: {
                  "account-a/repo-*": {
                    visibility: "private",
                    types: { actions: "deny", environments: {} },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  expect(
    authorizer.authorizeSecret(
      createTestProvisionRequest({
        to: [
          createTestAccountProvisionRequestTarget("actions", "account-a", {
            patterns: ["repo-*"],
            repos: [
              {
                ref: { account: "account-a", repo: "repo-x" },
                id: 1,
                visibility: "private",
              },
            ],
          }),
        ],
      }),
    ).isAllowed,
  ).toBe(true);
});
