import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { expect, it } from "vitest";
import { parseProviderConfig } from "../../../../src/config/provider-config.js";
import providerSchema from "../../../../src/schema/provider.v1.schema.json" with { type: "json" };
import type { ProviderConfig } from "../../../../src/type/provider-config.js";
import { throws } from "../../../error.js";

const fixturesPath = fileURLToPath(
  new URL("../../../fixture/provider-config", import.meta.url),
);

it("parses comprehensive provider config", async () => {
  const fixturePath = join(fixturesPath, "comprehensive.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(parseProviderConfig("account-self", "repo-self", yaml)).toEqual({
    $schema: providerSchema.$id,

    permissions: {
      rules: [
        {
          description: "Access to anything from anywhere",
          resources: [
            {
              accounts: ["*"],
              noRepos: true,
              allRepos: true,
              selectedRepos: ["*"],
            },
          ],
          consumers: ["*/*"],
          permissions: {
            contents: "read",
            issues: "read",
            metadata: "read",
            pull_requests: "read",
          },
        },
        {
          consumers: ["*/*"],
          description: "Access to a specific account from anywhere",
          permissions: {
            metadata: "read",
          },
          resources: [
            {
              accounts: ["account-a"],
              allRepos: false,
              noRepos: true,
              selectedRepos: [],
            },
          ],
        },
        {
          consumers: ["*/*"],
          description:
            "Access to all repos in a specific account from anywhere",
          permissions: {
            contents: "write",
          },
          resources: [
            {
              accounts: ["account-a"],
              allRepos: true,
              noRepos: false,
              selectedRepos: [],
            },
          ],
        },
        {
          consumers: ["*/*"],
          description:
            "Access to selected repos in a specific account from anywhere",
          permissions: {
            contents: "write",
          },
          resources: [
            {
              accounts: ["account-a"],
              allRepos: false,
              noRepos: false,
              selectedRepos: ["repo-a", "repo-*"],
            },
          ],
        },
        {
          consumers: ["account-a/*"],
          description: "Access to a specific account from the same account",
          permissions: {
            metadata: "read",
          },
          resources: [
            {
              accounts: ["account-a"],
              allRepos: false,
              noRepos: true,
              selectedRepos: [],
            },
          ],
        },
        {
          consumers: ["<account>/*"],
          description:
            "Access when the consuming account is the same as the resource account",
          permissions: {
            metadata: "read",
          },
          resources: [
            {
              accounts: ["*"],
              allRepos: false,
              noRepos: true,
              selectedRepos: [],
            },
          ],
        },
        {
          consumers: ["*/<repo>"],
          description: "Access to same-named repos (weird, but possible)",
          permissions: {
            contents: "write",
          },
          resources: [
            {
              accounts: ["*"],
              allRepos: false,
              noRepos: false,
              selectedRepos: ["*"],
            },
          ],
        },
        {
          consumers: ["<account>/<repo>"],
          description: "Repo self-access",
          permissions: {
            contents: "write",
          },
          resources: [
            {
              accounts: ["*"],
              allRepos: false,
              noRepos: false,
              selectedRepos: ["*"],
            },
          ],
        },
        {
          consumers: ["*/*"],
          description:
            "Access to repos with a specific name in any account (weird, but possible)",
          permissions: {
            contents: "write",
          },
          resources: [
            {
              accounts: ["*"],
              allRepos: false,
              noRepos: false,
              selectedRepos: ["repo-a"],
            },
          ],
        },
        {
          consumers: ["account-self/repo-b"],
          description: "Cross-repo access (in the provider's account)",
          permissions: {
            contents: "write",
          },
          resources: [
            {
              accounts: ["account-self"],
              allRepos: false,
              noRepos: false,
              selectedRepos: ["repo-a"],
            },
          ],
        },
        {
          consumers: ["account-self/repo-a"],
          description: "All-repo access (in the provider's account)",
          permissions: {
            contents: "write",
          },
          resources: [
            {
              accounts: ["account-self"],
              allRepos: true,
              noRepos: false,
              selectedRepos: [],
            },
          ],
        },
        {
          consumers: ["account-b/repo-b"],
          description: "Cross-account access",
          permissions: {
            contents: "write",
          },
          resources: [
            {
              accounts: ["account-a"],
              allRepos: false,
              noRepos: false,
              selectedRepos: ["repo-a"],
            },
          ],
        },
        {
          consumers: ["account-self/repo-b"],
          description: "Revocation of access",
          permissions: {
            contents: "none",
          },
          resources: [
            {
              accounts: ["account-self"],
              allRepos: false,
              noRepos: false,
              selectedRepos: ["repo-a"],
            },
          ],
        },
        {
          consumers: ["account-self/repo-b"],
          description: "Escalation of access",
          permissions: {
            contents: "write",
          },
          resources: [
            {
              accounts: ["account-self"],
              allRepos: false,
              noRepos: false,
              selectedRepos: ["repo-a"],
            },
          ],
        },
        {
          consumers: ["account-self/repo-b"],
          description: "De-escalation of access",
          permissions: {
            contents: "read",
          },
          resources: [
            {
              accounts: ["account-self"],
              allRepos: false,
              noRepos: false,
              selectedRepos: ["repo-a"],
            },
          ],
        },
        {
          consumers: ["account-e/repo-e", "account-f/repo-f"],
          description: "Multiple resources and consumers",
          permissions: {
            contents: "write",
          },
          resources: [
            {
              accounts: ["account-a", "account-b"],
              allRepos: false,
              noRepos: false,
              selectedRepos: ["repo-a", "repo-b"],
            },
            {
              accounts: ["account-c", "account-d"],
              allRepos: false,
              noRepos: false,
              selectedRepos: ["repo-c", "repo-d"],
            },
          ],
        },
        {
          consumers: ["*-account/*-repo"],
          description: "Wildcards",
          permissions: {
            contents: "write",
          },
          resources: [
            {
              accounts: ["account-*"],
              allRepos: false,
              noRepos: false,
              selectedRepos: ["repo-*"],
            },
          ],
        },
        {
          consumers: ["account-self/repo-b"],
          description: "All permissions",
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
          resources: [
            {
              accounts: ["account-self"],
              allRepos: true,
              noRepos: true,
              selectedRepos: ["*"],
            },
          ],
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
                account: {},
                accounts: {},
                repo: {
                  actions: "allow",
                  codespaces: "allow",
                  dependabot: "allow",
                  environments: {
                    "*": "allow",
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
                  actions: "allow",
                  codespaces: "allow",
                  dependabot: "allow",
                },
                accounts: {},
                repo: {
                  environments: {},
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
                account: {},
                accounts: {
                  "account-a": {
                    dependabot: "allow",
                  },
                  "account-b": {
                    dependabot: "allow",
                  },
                },
                repo: {
                  environments: {},
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
                account: {},
                accounts: {
                  "*": {
                    dependabot: "allow",
                  },
                },
                repo: {
                  environments: {},
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
                account: {},
                accounts: {},
                repo: {
                  environments: {},
                },
                repos: {
                  "account-self/repo-b": {
                    codespaces: "allow",
                    environments: {},
                  },
                  "account-b/repo-c": {
                    codespaces: "allow",
                    environments: {},
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
                account: {},
                accounts: {},
                repo: {
                  environments: {},
                },
                repos: {
                  "account-self/repo-b": {
                    environments: {
                      "env-a": "allow",
                      "env-b": "allow",
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
                account: {},
                accounts: {},
                repo: {
                  environments: {},
                },
                repos: {
                  "*/*": {
                    actions: "allow",
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
          {
            description:
              "Specific repos can provision to a specific actions secret in any repo in a specific account",
            secrets: ["SECRET_A"],
            requesters: ["account-self/repo-a", "account-self/repo-b"],
            to: {
              github: {
                account: {},
                accounts: {},
                repo: {
                  environments: {},
                },
                repos: {
                  "account-b/*": {
                    actions: "allow",
                    environments: {},
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
                  actions: "allow",
                },
                accounts: {
                  "account-a": {
                    actions: "allow",
                  },
                  "account-b": {
                    actions: "allow",
                  },
                },
                repo: {
                  actions: "allow",
                  environments: {},
                },
                repos: {
                  "account-self/repo-a": {
                    actions: "allow",
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
          {
            description:
              "No repos can provision to a specific secret of any kind in any account or repo",
            secrets: ["SECRET_X"],
            requesters: ["*/*"],
            to: {
              github: {
                account: {},
                accounts: {
                  "*": {
                    actions: "deny",
                    codespaces: "deny",
                    dependabot: "deny",
                  },
                },
                repo: {
                  environments: {},
                },
                repos: {
                  "*/*": {
                    actions: "deny",
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
          {
            description:
              "Specific repos can't provision to a specific secret of any kind in the same repo",
            secrets: ["SECRET_X"],
            requesters: ["account-self/repo-a", "account-self/repo-b"],
            to: {
              github: {
                account: {},
                accounts: {},
                repo: {
                  actions: "deny",
                  codespaces: "deny",
                  dependabot: "deny",
                  environments: {
                    "*": "deny",
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
                account: {},
                accounts: {},
                repo: {
                  actions: "allow",
                  codespaces: "deny",
                  dependabot: "allow",
                  environments: {
                    "*": "allow",
                    "env-a": "deny",
                    "env-b": "deny",
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

  expect(parseProviderConfig("account-self", "repo-self", yaml)).toEqual({
    $schema: providerSchema.$id,
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  } satisfies ProviderConfig);
});

it("parses provider configs that are empty", async () => {
  expect(parseProviderConfig("account-self", "repo-self", "")).toEqual({
    $schema: providerSchema.$id,
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

  expect(throws(() => parseProviderConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of provider configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n\\npermissions:\\n  rules:\\n    - resources:\\n        - accounts: [-account-a]\\n          noRepos: true\\n      consumers: [./repo-a]\\n"

      Caused by: Invalid provider configuration:
        - must be a single period, or only contain alphanumeric characters, hyphens, or asterisks, and cannot begin or end with a hyphen (/permissions/rules/0/resources/0/accounts/0)"
    `);
});

it("throws when an invalid pattern is used in /permissions/rules/<n>/consumers/<n>", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-pattern-permissions-rules-consumers.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseProviderConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of provider configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n\\npermissions:\\n  rules:\\n    - resources:\\n        - accounts: [account-a]\\n          noRepos: true\\n      consumers: [/repo-x]\\n"

      Caused by: Invalid provider configuration:
        - must be a repo pattern in the form of "account/repo", or "./repo" (/permissions/rules/0/consumers/0)"
    `);
});

it("throws when an invalid pattern is used in /provision/rules/secrets/<n>/requesters/<n>", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-pattern-provision-rules-secrets-requesters.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseProviderConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of provider configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n\\nprovision:\\n  rules:\\n    secrets:\\n      - secrets: [\\"*\\"]\\n        requesters: [repo-x]\\n        to:\\n          github:\\n            repo:\\n              actions: allow\\n"

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

  expect(throws(() => parseProviderConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of provider configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n\\nprovision:\\n  rules:\\n    secrets:\\n      - secrets: [\\"*\\"]\\n        requesters: [\\"*/*\\"]\\n        to:\\n          github:\\n            repos:\\n              repo-x:\\n                actions: allow\\n"

      Caused by: Invalid provider configuration:
        - must be a repo pattern in the form of "account/repo", or "./repo" (/provision/rules/secrets/0/to/github/repos)
        - property name must be valid (/provision/rules/secrets/0/to/github/repos)"
    `);
});

it("throws when there are additional properties", async () => {
  const fixturePath = join(fixturesPath, "additional-properties.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseProviderConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of provider configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\nadditional: This should not be allowed\\n"

      Caused by: Invalid provider configuration:
        - must NOT have additional properties"
    `);
});

it("throws when the YAML is invalid", async () => {
  expect(throws(() => parseProviderConfig("account-self", "repo-self", "{")))
    .toMatchInlineSnapshot(`
      "Parsing of provider configuration failed for "{"

      Caused by: unexpected end of the stream within a flow collection (2:1)

       1 | {
       2 |
      -----^"
    `);
});
