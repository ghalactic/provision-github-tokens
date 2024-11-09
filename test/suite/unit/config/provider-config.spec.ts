import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { expect, it } from "vitest";
import { parseProviderConfig } from "../../../../src/config/provider-config.js";
import providerSchema from "../../../../src/schema/provider.v1.schema.json";
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
      rules: {
        repos: [
          {
            description: "Access across all accounts and repos",
            resources: ["*/*"],
            consumers: ["*/*"],
            permissions: {
              contents: "read",
              issues: "read",
              metadata: "read",
              pull_requests: "read",
            },
          },
          {
            description: "Access to a specific account from anywhere",
            resources: ["account-a/*"],
            consumers: ["*/*"],
            permissions: { metadata: "read" },
          },
          {
            description: "Access to a specific account from the same account",
            resources: ["account-a/*"],
            consumers: ["account-a/*"],
            permissions: { issues: "write" },
          },
          {
            description: "Access within the same account",
            resources: ["*/*"],
            consumers: ["<account>/*"],
            permissions: { issues: "write", pull_requests: "write" },
          },
          {
            description: "Access to same-named repos (weird, but possible)",
            resources: ["*/*"],
            consumers: ["*/<repo>"],
            permissions: { metadata: "read" },
          },
          {
            description: "Self-access",
            resources: ["*/*"],
            consumers: ["<account>/<repo>"],
            permissions: { contents: "write", metadata: "write" },
          },
          {
            description:
              "Access to repos with a specific name in any account (weird, but possible)",
            resources: ["*/repo-a"],
            consumers: ["*/*"],
            permissions: { metadata: "read" },
          },
          {
            description: "Cross-repo access (in the provider's account)",
            resources: ["account-self/repo-a"],
            consumers: ["account-self/repo-b"],
            permissions: { contents: "read" },
          },
          {
            description: "All-repo access (in the provider's account)",
            resources: ["account-self/*"],
            consumers: ["account-self/repo-a"],
            permissions: { contents: "read" },
          },
          {
            description: "Cross-account access",
            resources: ["account-a/repo-a"],
            consumers: ["account-b/repo-b"],
            permissions: { contents: "read" },
          },
          {
            description: "Revocation of access",
            resources: ["account-self/repo-a"],
            consumers: ["account-self/repo-b"],
            permissions: { contents: "none" },
          },
          {
            description: "Escalation of access",
            resources: ["account-self/repo-a"],
            consumers: ["account-self/repo-b"],
            permissions: { contents: "write" },
          },
          {
            description: "De-escalation of access",
            resources: ["account-self/repo-a"],
            consumers: ["account-self/repo-b"],
            permissions: { contents: "read" },
          },
          {
            description: "Multiple resources and consumers",
            resources: ["account-self/repo-a", "account-self/repo-b"],
            consumers: ["account-self/repo-c", "account-self/repo-d"],
            permissions: { contents: "read" },
          },
          {
            description: "Wildcards",
            resources: ["account-*/repo-*"],
            consumers: ["*-account/*-repo"],
            permissions: { contents: "read" },
          },
          {
            description: "All permissions",
            resources: ["account-self/repo-a"],
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
    permissions: { rules: { repos: [] } },
    provision: { rules: { secrets: [] } },
  } satisfies ProviderConfig);
});

it("parses provider configs that are empty", async () => {
  expect(parseProviderConfig("account-self", "repo-self", "")).toEqual({
    $schema: providerSchema.$id,
    permissions: { rules: { repos: [] } },
    provision: { rules: { secrets: [] } },
  } satisfies ProviderConfig);
});

it("throws when an invalid repo pattern is used in /permissions/rules/repos/<n>/resources/<n>", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-repo-pattern-permissions-rules-repos-resources.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseProviderConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of provider configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n\\npermissions:\\n  rules:\\n    repos:\\n      - resources: [repo-x]\\n        consumers: [./repo-a]\\n"

      Caused by: Invalid provider configuration:
        - must match pattern "^(?:\\.|[*a-zA-Z](?:[*a-zA-Z-]*[*a-zA-Z])?)\\/[*a-zA-Z0-9-_.]+$" (/permissions/rules/repos/0/resources/0)"
    `);
});

it("throws when an invalid repo pattern is used in /permissions/rules/repos/<n>/consumers/<n>", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-repo-pattern-permissions-rules-repos-consumers.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseProviderConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of provider configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n\\npermissions:\\n  rules:\\n    repos:\\n      - resources: [./repo-a]\\n        consumers: [repo-x]\\n"

      Caused by: Invalid provider configuration:
        - must match pattern "^(?:\\.|[*<>a-zA-Z](?:[*<>a-zA-Z-]*[*<>a-zA-Z])?)\\/[*<>a-zA-Z0-9-_.]+$" (/permissions/rules/repos/0/consumers/0)"
    `);
});

it("throws when an invalid repo pattern is used in /provision/rules/secrets/<n>/requesters/<n>", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-repo-pattern-provision-rules-secrets-requesters.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseProviderConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of provider configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n\\nprovision:\\n  rules:\\n    secrets:\\n      - secrets: [\\"*\\"]\\n        requesters: [\\"repo-x\\"]\\n        to:\\n          github:\\n            repo:\\n              actions: allow\\n"

      Caused by: Invalid provider configuration:
        - must match pattern "^(?:\\.|[*a-zA-Z](?:[*a-zA-Z-]*[*a-zA-Z])?)\\/[*a-zA-Z0-9-_.]+$" (/provision/rules/secrets/0/requesters/0)"
    `);
});

it("throws when an invalid repo pattern is used in /provision/rules/secrets/<n>/to/github/repos/<pattern>", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-repo-pattern-provision-rules-secrets-to-github-repos.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseProviderConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of provider configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/provider.v1.schema.json\\n\\nprovision:\\n  rules:\\n    secrets:\\n      - secrets: [\\"*\\"]\\n        requesters: [\\"*/*\\"]\\n        to:\\n          github:\\n            repos:\\n              repo-x:\\n                actions: allow\\n"

      Caused by: Invalid provider configuration:
        - must match pattern "^(?:\\.|[*a-zA-Z](?:[*a-zA-Z-]*[*a-zA-Z])?)\\/[*a-zA-Z0-9-_.]+$" (/provision/rules/secrets/0/to/github/repos)
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
