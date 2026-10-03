import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, expect, it, vi } from "vitest";
import {
  __reset as __resetCore,
  __setInputs,
} from "../../__mocks__/@actions/core.js";
import {
  __reset as __resetOctokit,
  __setFiles,
} from "../../__mocks__/@octokit/action.js";
import { createTestAppRegistry } from "../../test/app-registry.js";
import { testContext } from "../../test/context.js";
import { throws } from "../../test/error.js";
import {
  createTestApps,
  createTestInstallationAccounts,
} from "../../test/github-api.js";
import { createTestOctokitFactory } from "../../test/octokit-factory.js";
import { createTestRepoRegistry } from "../../test/repo-registry.js";
import providerSchema from "../schema/provider.v1.schema.json" with { type: "json" };
import type { ProviderConfig } from "../type/provider-config.js";
import { parseProviderConfig, readProviderConfig } from "./provider-config.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

const fixturesPath = join(import.meta.dirname, "testdata/provider-config");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("reads comprehensive provider config", async () => {
  __setInputs({ configPath: "path/to/provider-config.yml" });

  const fixturePath = join(fixturesPath, "comprehensive.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-self",
    ["repo-self"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { octokitFactory } = createTestOctokitFactory(appRegistry);

  __setFiles(repoA.full_name, {
    "path/to/provider-config.yml": {
      content: yaml,
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });

  expect(
    await readProviderConfig(
      {
        ...testContext,
        githubRepository: "account-self/repo-self",
        githubRepositoryUrl:
          "https://github.example.com/account-self/repo-self",
        githubRef: "refs/heads/main",
      },
      octokitFactory,
    ),
  ).toEqual({
    $schema: providerSchema.$id,

    dashboards: {
      enabled: false,
    },

    permissions: {
      rules: [
        {
          description: "Access to anything from anywhere",
          resources: [
            {
              accounts: ["*"],
              noRepos: true,
              allRepos: true,
              selectedRepos: { repos: ["*"], visibility: "private" },
            },
          ],
          consumers: ["*", "*/*"],
          permissions: {
            contents: "read",
            issues: "read",
            metadata: "read",
            pull_requests: "read",
          },
        },
        {
          description: "Access to a specific account from anywhere",
          consumers: ["*", "*/*"],
          resources: [
            {
              accounts: ["account-a"],
              allRepos: false,
              noRepos: true,
            },
          ],
          permissions: {
            metadata: "read",
          },
        },
        {
          description:
            "Access to all repos in a specific account from anywhere",
          resources: [
            {
              accounts: ["account-a"],
              allRepos: true,
              noRepos: false,
            },
          ],
          consumers: ["*", "*/*"],
          permissions: {
            contents: "write",
          },
        },
        {
          description:
            "Access to selected repos in a specific account from anywhere",
          resources: [
            {
              accounts: ["account-a"],
              allRepos: false,
              noRepos: false,
              selectedRepos: {
                repos: ["repo-a", "repo-*"],
                visibility: "internal",
              },
            },
          ],
          consumers: ["*", "*/*"],
          permissions: {
            contents: "write",
          },
        },
        {
          description: "Access to a specific account from the same account",
          resources: [
            {
              accounts: ["account-a"],
              allRepos: false,
              noRepos: true,
            },
          ],
          consumers: ["account-a"],
          permissions: {
            metadata: "read",
          },
        },
        {
          description:
            "Access when the consuming account is the same as the resource account",
          resources: [
            {
              accounts: ["*"],
              allRepos: false,
              noRepos: true,
            },
          ],
          consumers: ["<account>"],
          permissions: {
            metadata: "read",
          },
        },
        {
          description:
            "Access to same-named repos in any account (weird, but possible)",
          resources: [
            {
              accounts: ["*"],
              allRepos: false,
              noRepos: false,
              selectedRepos: { repos: ["*"], visibility: "private" },
            },
          ],
          consumers: ["*/<repo>"],
          permissions: {
            contents: "write",
          },
        },
        {
          description: "Repo self-access",
          resources: [
            {
              accounts: ["*"],
              allRepos: false,
              noRepos: false,
              selectedRepos: { repos: ["*"], visibility: "private" },
            },
          ],
          consumers: ["<account>/<repo>"],
          permissions: {
            contents: "write",
          },
        },
        {
          description:
            "Access to repos with a specific name from anywhere (weird, but possible)",
          resources: [
            {
              accounts: ["*"],
              allRepos: false,
              noRepos: false,
              selectedRepos: { repos: ["repo-a"], visibility: "private" },
            },
          ],
          consumers: ["*", "*/*"],
          permissions: {
            contents: "write",
          },
        },
        {
          description: "Cross-repo access (in the provider's account)",
          resources: [
            {
              accounts: ["account-self"],
              allRepos: false,
              noRepos: false,
              selectedRepos: { repos: ["repo-a"], visibility: "private" },
            },
          ],
          consumers: ["account-self/repo-b"],
          permissions: {
            contents: "write",
          },
        },
        {
          description: "All-repo access (in the provider's account)",
          resources: [
            {
              accounts: ["account-self"],
              allRepos: true,
              noRepos: false,
            },
          ],
          consumers: ["account-self/repo-a"],
          permissions: {
            contents: "write",
          },
        },
        {
          description: "Cross-account repo access",
          resources: [
            {
              accounts: ["account-a"],
              allRepos: false,
              noRepos: false,
              selectedRepos: { repos: ["repo-a"], visibility: "private" },
            },
          ],
          consumers: ["account-b/repo-b"],
          permissions: {
            contents: "write",
          },
        },
        {
          description: "Revocation of access",
          consumers: ["account-self/repo-b"],
          resources: [
            {
              accounts: ["account-self"],
              allRepos: false,
              noRepos: false,
              selectedRepos: { repos: ["repo-a"], visibility: "private" },
            },
          ],
          permissions: {
            contents: "none",
          },
        },
        {
          description: "Escalation of access",
          resources: [
            {
              accounts: ["account-self"],
              allRepos: false,
              noRepos: false,
              selectedRepos: { repos: ["repo-a"], visibility: "private" },
            },
          ],
          consumers: ["account-self/repo-b"],
          permissions: {
            contents: "write",
          },
        },
        {
          description: "De-escalation of access",
          resources: [
            {
              accounts: ["account-self"],
              allRepos: false,
              noRepos: false,
              selectedRepos: { repos: ["repo-a"], visibility: "private" },
            },
          ],
          consumers: ["account-self/repo-b"],
          permissions: {
            contents: "read",
          },
        },
        {
          description: "Multiple resources and consumers",
          resources: [
            {
              accounts: ["account-a", "account-b"],
              allRepos: false,
              noRepos: false,
              selectedRepos: {
                repos: ["repo-a", "repo-b"],
                visibility: "private",
              },
            },
            {
              accounts: ["account-c", "account-d"],
              allRepos: false,
              noRepos: false,
              selectedRepos: {
                repos: ["repo-c", "repo-d"],
                visibility: "private",
              },
            },
          ],
          consumers: ["account-e", "account-f/repo-f", "account-g/repo-g"],
          permissions: {
            contents: "write",
          },
        },
        {
          description: "Wildcards",
          resources: [
            {
              accounts: ["account-*"],
              allRepos: false,
              noRepos: false,
              selectedRepos: { repos: ["repo-*"], visibility: "private" },
            },
          ],
          consumers: ["*-account", "*-account/*-repo"],
          permissions: {
            contents: "write",
          },
        },
        {
          description: "All permissions",
          resources: [
            {
              accounts: ["account-self"],
              allRepos: true,
              noRepos: true,
              selectedRepos: { repos: ["*"], visibility: "private" },
            },
          ],
          consumers: ["account-self/repo-b"],
          permissions: {
            actions: "write",
            administration: "write",
            checks: "write",
            codespaces: "write",
            contents: "write",
            dependabot_secrets: "write",
            deployments: "write",
            email_addresses: "write",
            environments: "write",
            followers: "write",
            git_ssh_keys: "write",
            gpg_keys: "write",
            interaction_limits: "write",
            issues: "write",
            members: "write",
            metadata: "write",
            organization_administration: "write",
            organization_announcement_banners: "write",
            organization_copilot_seat_management: "write",
            organization_custom_org_roles: "write",
            organization_custom_properties: "admin",
            organization_custom_roles: "write",
            organization_events: "read",
            organization_hooks: "write",
            organization_packages: "write",
            organization_personal_access_token_requests: "write",
            organization_personal_access_tokens: "write",
            organization_plan: "read",
            organization_projects: "admin",
            organization_secrets: "write",
            organization_self_hosted_runners: "write",
            organization_user_blocking: "write",
            packages: "write",
            pages: "write",
            profile: "write",
            pull_requests: "write",
            repository_custom_properties: "write",
            repository_hooks: "write",
            repository_projects: "admin",
            secret_scanning_alerts: "write",
            secrets: "write",
            security_events: "write",
            single_file: "write",
            starring: "write",
            statuses: "write",
            team_discussions: "write",
            vulnerability_alerts: "write",
            workflows: "write",
            xxx: "admin",
          },
        },
      ],
    },

    provision: {
      rules: {
        secrets: [
          {
            description:
              "All repos can provision to any secret of any kind in the same repo",
            requesters: ["*/*"],
            secrets: ["*"],
            to: {
              github: {
                account: { types: {} },
                accounts: {},
                repo: {
                  visibility: "private",
                  types: {
                    actions: "allow",
                    agents: "allow",
                    codespaces: "allow",
                    dependabot: "allow",
                    environments: {
                      "*": "allow",
                    },
                  },
                },
                repos: {},
              },
            },
          },
          {
            description:
              "Specific repos can provision to any secret of any kind in their own account",
            secrets: ["*"],
            requesters: ["account-self/repo-a", "account-self/repo-b"],
            to: {
              github: {
                account: {
                  types: {
                    actions: "allow",
                    agents: "allow",
                    codespaces: "allow",
                    dependabot: "allow",
                  },
                },
                accounts: {},
                repo: {
                  visibility: "private",
                  types: {
                    environments: {},
                  },
                },
                repos: {},
              },
            },
          },
          {
            description:
              "Specific repos can provision to dependabot secrets in specific accounts",
            secrets: ["*"],
            requesters: ["account-self/repo-a", "account-self/repo-b"],
            to: {
              github: {
                account: { types: {} },
                accounts: {
                  "account-a": {
                    types: {
                      dependabot: "allow",
                    },
                  },
                  "account-b": {
                    types: {
                      dependabot: "allow",
                    },
                  },
                },
                repo: {
                  visibility: "private",
                  types: {
                    environments: {},
                  },
                },
                repos: {},
              },
            },
          },
          {
            description:
              "Specific repos can provision to dependabot secrets in any account",
            secrets: ["*"],
            requesters: ["account-self/repo-a", "account-self/repo-b"],
            to: {
              github: {
                account: { types: {} },
                accounts: {
                  "*": {
                    types: {
                      dependabot: "allow",
                    },
                  },
                },
                repo: {
                  visibility: "private",
                  types: {
                    environments: {},
                  },
                },
                repos: {},
              },
            },
          },
          {
            description:
              "A specific repo can provision to a specific codespaces secret in other repos",
            secrets: ["SECRET_A"],
            requesters: ["account-self/repo-a"],
            to: {
              github: {
                account: { types: {} },
                accounts: {},
                repo: {
                  visibility: "private",
                  types: {
                    environments: {},
                  },
                },
                repos: {
                  "account-self/repo-b": {
                    visibility: "private",
                    types: {
                      agents: "allow",
                      codespaces: "allow",
                      environments: {},
                    },
                  },
                  "account-b/repo-c": {
                    visibility: "private",
                    types: {
                      agents: "allow",
                      codespaces: "allow",
                      environments: {},
                    },
                  },
                },
              },
            },
          },
          {
            description:
              "A specific repo can provision to specific secrets of specific environments in another repo",
            secrets: ["SECRET_A"],
            requesters: ["account-self/repo-a"],
            to: {
              github: {
                account: { types: {} },
                accounts: {},
                repo: {
                  visibility: "private",
                  types: {
                    environments: {},
                  },
                },
                repos: {
                  "account-self/repo-b": {
                    visibility: "private",
                    types: {
                      environments: {
                        "env-a": "allow",
                        "env-b": "allow",
                      },
                    },
                  },
                },
              },
            },
          },
          {
            description:
              "Specific repos can provision to a specific secret of any kind in any repo in any account",
            secrets: ["SECRET_A"],
            requesters: ["account-self/repo-a", "account-self/repo-b"],
            to: {
              github: {
                account: { types: {} },
                accounts: {},
                repo: {
                  visibility: "private",
                  types: {
                    environments: {},
                  },
                },
                repos: {
                  "*/*": {
                    visibility: "private",
                    types: {
                      actions: "allow",
                      agents: "allow",
                      codespaces: "allow",
                      dependabot: "allow",
                      environments: {
                        "*": "allow",
                      },
                    },
                  },
                },
              },
            },
          },
          {
            description:
              "Specific repos can provision to a specific actions secret in any repo in a specific account",
            secrets: ["SECRET_A"],
            requesters: ["account-self/repo-a", "account-self/repo-b"],
            to: {
              github: {
                account: { types: {} },
                accounts: {},
                repo: {
                  visibility: "private",
                  types: {
                    environments: {},
                  },
                },
                repos: {
                  "account-b/*": {
                    visibility: "private",
                    types: {
                      actions: "allow",
                      environments: {},
                    },
                  },
                },
              },
            },
          },
          {
            description:
              "Specific repos can provision any actions secret in the same repo or account, or specific other repos and accounts",
            secrets: ["*"],
            requesters: ["account-self/repo-a", "account-self/repo-b"],
            to: {
              github: {
                account: {
                  types: {
                    actions: "allow",
                  },
                },
                accounts: {
                  "account-a": {
                    types: {
                      actions: "allow",
                    },
                  },
                  "account-b": {
                    types: {
                      actions: "allow",
                    },
                  },
                },
                repo: {
                  visibility: "private",
                  types: {
                    actions: "allow",
                    environments: {},
                  },
                },
                repos: {
                  "account-self/repo-a": {
                    visibility: "private",
                    types: {
                      actions: "allow",
                      environments: {},
                    },
                  },
                  "account-a/repo-a": {
                    visibility: "private",
                    types: {
                      actions: "allow",
                      environments: {},
                    },
                  },
                },
              },
            },
          },
          {
            description:
              "No repos can provision to a specific secret of any kind in any account or repo",
            secrets: ["SECRET_X"],
            requesters: ["*/*"],
            to: {
              github: {
                account: { types: {} },
                accounts: {
                  "*": {
                    types: {
                      actions: "deny",
                      agents: "deny",
                      codespaces: "deny",
                      dependabot: "deny",
                    },
                  },
                },
                repo: {
                  visibility: "private",
                  types: {
                    environments: {},
                  },
                },
                repos: {
                  "*/*": {
                    visibility: "private",
                    types: {
                      actions: "deny",
                      agents: "deny",
                      codespaces: "deny",
                      dependabot: "deny",
                      environments: {
                        "*": "deny",
                      },
                    },
                  },
                },
              },
            },
          },
          {
            description:
              "Specific repos can't provision to a specific secret of any kind in the same repo",
            secrets: ["SECRET_X"],
            requesters: ["account-self/repo-a", "account-self/repo-b"],
            to: {
              github: {
                account: { types: {} },
                accounts: {},
                repo: {
                  visibility: "private",
                  types: {
                    actions: "deny",
                    agents: "deny",
                    codespaces: "deny",
                    dependabot: "deny",
                    environments: {
                      "*": "deny",
                    },
                  },
                },
                repos: {},
              },
            },
          },
          {
            description:
              "Rules can have both allow and deny, but deny takes precedence",
            secrets: ["SECRET_A"],
            requesters: ["account-self/repo-a"],
            to: {
              github: {
                account: { types: {} },
                accounts: {},
                repo: {
                  visibility: "private",
                  types: {
                    actions: "allow",
                    agents: "deny",
                    codespaces: "deny",
                    dependabot: "allow",
                    environments: {
                      "*": "allow",
                      "env-a": "deny",
                      "env-b": "deny",
                    },
                  },
                },
                repos: {},
              },
            },
          },
        ],
      },
    },
  } satisfies ProviderConfig);
});

it("parses provider configs that are just comments", async () => {
  const fixturePath = join(fixturesPath, "just-comments.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    parseProviderConfig(
      { account: "account-self", repo: "repo-self" },
      "path/to/config.yml",
      yaml,
    ),
  ).toEqual({
    $schema: providerSchema.$id,
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  } satisfies ProviderConfig);
});

it("parses provider configs that are empty", () => {
  expect(
    parseProviderConfig(
      { account: "account-self", repo: "repo-self" },
      "path/to/config.yml",
      "",
    ),
  ).toEqual({
    $schema: providerSchema.$id,
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  } satisfies ProviderConfig);
});

it("throws when an invalid pattern is used in /permissions/rules/<n>/resources/<n>/accounts/<n>", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-pattern-permissions-rules-resources-accounts.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseProviderConfig(
        { account: "account-self", repo: "repo-self" },
        "path/to/config.yml",
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
    "Parsing of provider configuration failed

    Caused by: Invalid provider configuration:
      - must be a single period, or only contain alphanumeric characters, hyphens, or asterisks, and can't begin or end with a hyphen (/permissions/rules/0/resources/0/accounts/0)"
  `);
});

it("throws when an invalid pattern is used in /permissions/rules/<n>/consumers/<n>", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-pattern-permissions-rules-consumers.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseProviderConfig(
        { account: "account-self", repo: "repo-self" },
        "path/to/config.yml",
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
      "Parsing of provider configuration failed

      Caused by: Invalid provider configuration:
        - must be a pattern in the form of "account", "account/repo", or "./repo" (/permissions/rules/0/consumers/0)"
    `);
});

it("throws when an invalid pattern is used in /provision/rules/secrets/<n>/requesters/<n>", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-pattern-provision-rules-secrets-requesters.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseProviderConfig(
        { account: "account-self", repo: "repo-self" },
        "path/to/config.yml",
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
    "Parsing of provider configuration failed

    Caused by: Invalid provider configuration:
      - must be a repo pattern in the form of "account/repo", or "./repo" (/provision/rules/secrets/0/requesters/0)"
  `);
});

it("throws when an invalid pattern is used in /provision/rules/secrets/<n>/to/github/repos/<pattern>", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-pattern-provision-rules-secrets-to-github-repos.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseProviderConfig(
        { account: "account-self", repo: "repo-self" },
        "path/to/config.yml",
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
    "Parsing of provider configuration failed

    Caused by: Invalid provider configuration:
      - must be a repo pattern in the form of "account/repo", or "./repo" (/provision/rules/secrets/0/to/github/repos)
      - property name must be valid (/provision/rules/secrets/0/to/github/repos)"
  `);
});

it("throws when there are additional properties", async () => {
  const fixturePath = join(fixturesPath, "additional-properties.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseProviderConfig(
        { account: "account-self", repo: "repo-self" },
        "path/to/config.yml",
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
      "Parsing of provider configuration failed

      Caused by: Invalid provider configuration:
        - must NOT have additional properties"
    `);
});

it("throws when selectedRepos has no repos", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-selected-repos-missing-repos.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseProviderConfig(
        { account: "account-self", repo: "repo-self" },
        "path/to/config.yml",
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
    "Parsing of provider configuration failed

    Caused by: Invalid provider configuration:
      - must have required property 'repos' (/permissions/rules/0/resources/0/selectedRepos)"
  `);
});

it("throws when selectedRepos has an empty repos list", async () => {
  const fixturePath = join(fixturesPath, "invalid-selected-repos-empty.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseProviderConfig(
        { account: "account-self", repo: "repo-self" },
        "path/to/config.yml",
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
    "Parsing of provider configuration failed

    Caused by: Invalid provider configuration:
      - must NOT have fewer than 1 items (/permissions/rules/0/resources/0/selectedRepos/repos)"
  `);
});

it("throws when selectedRepos has an unknown visibility", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-selected-repos-visibility.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseProviderConfig(
        { account: "account-self", repo: "repo-self" },
        "path/to/config.yml",
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
    "Parsing of provider configuration failed

    Caused by: Invalid provider configuration:
      - must be equal to one of the allowed values (/permissions/rules/0/resources/0/selectedRepos/visibility)"
  `);
});

it("throws when an account provision target has environments", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-provision-account-environments.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseProviderConfig(
        { account: "account-self", repo: "repo-self" },
        "path/to/config.yml",
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
    "Parsing of provider configuration failed

    Caused by: Invalid provider configuration:
      - must NOT have additional properties (/provision/rules/secrets/0/to/github/account/types)"
  `);
});

it("defaults repo provision target visibility to private", async () => {
  const fixturePath = join(
    fixturesPath,
    "provision-repo-target-visibility.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  const config = parseProviderConfig(
    { account: "account-self", repo: "repo-self" },
    "path/to/config.yml",
    yaml,
  );

  const targets = config.provision.rules.secrets[0].to.github.repos;

  expect(targets["account-a/repo-default"].visibility).toBe("private");
  expect(targets["account-a/repo-explicit"].visibility).toBe("internal");
});

it("throws when the YAML is invalid", () => {
  expect(
    throws(() =>
      parseProviderConfig(
        { account: "account-self", repo: "repo-self" },
        "path/to/config.yml",
        "{",
      ),
    ),
  ).toMatchInlineSnapshot(`
    "Parsing of provider configuration failed

    Caused by: Invalid YAML in account-self/repo-self/path/to/config.yml

    Caused by: Flow map must end with a } at line 1, column 2:

    {
     ^"
  `);
});
