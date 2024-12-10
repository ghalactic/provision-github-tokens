import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { expect, it } from "vitest";
import { parseConsumerConfig } from "../../../../src/config/consumer-config.js";
import consumerSchema from "../../../../src/schema/consumer.v1.schema.json" with { type: "json" };
import type { ConsumerConfig } from "../../../../src/type/consumer-config.js";
import { throws } from "../../../error.js";

const fixturesPath = fileURLToPath(
  new URL("../../../fixture/consumer-config", import.meta.url),
);

it("parses comprehensive consumer config", async () => {
  const fixturePath = join(fixturesPath, "comprehensive.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(parseConsumerConfig("account-self", "repo-self", yaml)).toEqual({
    $schema: consumerSchema.$id,

    tokens: {
      oneRepOnePerm: {
        shared: false,
        as: undefined,
        account: "account-self",
        repos: ["repo-a"],
        permissions: { contents: "read" },
      },

      multiRepoMultiPerm: {
        shared: false,
        as: undefined,
        account: "account-self",
        repos: ["repo-a", "repo-b"],
        permissions: { contents: "read", metadata: "read" },
      },

      wildcardRepos: {
        shared: false,
        as: undefined,
        account: "account-self",
        repos: ["repo-*"],
        permissions: { contents: "read" },
      },

      wildcardAllRepos: {
        shared: false,
        as: undefined,
        account: "account-self",
        repos: ["*"],
        permissions: { contents: "read" },
      },

      allRepos: {
        shared: false,
        as: undefined,
        account: "account-self",
        repos: "all",
        permissions: { contents: "read" },
      },

      withSharedFalse: {
        shared: false,
        as: undefined,
        account: "account-self",
        repos: ["repo-a"],
        permissions: { contents: "read" },
      },

      withSharedTrue: {
        shared: true,
        as: undefined,
        account: "account-self",
        repos: ["repo-a"],
        permissions: { contents: "read" },
      },

      withAs: {
        shared: false,
        as: "role-a",
        account: "account-self",
        repos: ["repo-a"],
        permissions: { contents: "write" },
      },

      withAccount: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: ["repo-a"],
        permissions: { contents: "read" },
      },

      withAllOptions: {
        shared: true,
        as: "role-a",
        account: "account-a",
        repos: ["repo-a", "repo-*"],
        permissions: { contents: "write", metadata: "read" },
      },

      withAllPermissions: {
        shared: false,
        as: "role-a",
        account: "account-self",
        repos: "all",
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
    },

    provision: {
      secrets: {
        TO_REPO_ACTIONS: {
          token: "account-self/repo-self.tokenA",
          github: {
            repo: {
              actions: true,
              codespaces: false,
              dependabot: false,
              environments: [],
            },
            repos: {},
            account: {
              actions: false,
              codespaces: false,
              dependabot: false,
            },
            accounts: {},
          },
        },

        TO_ACCOUNT_DEPENDABOT: {
          token: "account-self/other-repo.tokenB",
          github: {
            repo: {
              actions: false,
              codespaces: false,
              dependabot: false,
              environments: [],
            },
            repos: {},
            account: {
              actions: false,
              codespaces: false,
              dependabot: true,
            },
            accounts: {},
          },
        },

        TO_EVERYWHERE: {
          token: "other-account/repo.tokenC",
          github: {
            account: { actions: true, codespaces: true, dependabot: true },
            accounts: {
              "account-a": {
                actions: true,
                codespaces: false,
                dependabot: false,
              },
              "account-b": {
                actions: true,
                codespaces: true,
                dependabot: true,
              },
            },
            repo: {
              actions: true,
              codespaces: true,
              dependabot: true,
              environments: ["env-a", "env-b"],
            },
            repos: {
              "account-self/repo-a": {
                actions: true,
                codespaces: false,
                dependabot: false,
                environments: [],
              },
              "account-a/repo-a": {
                actions: true,
                codespaces: true,
                dependabot: true,
                environments: ["env-a", "env-b"],
              },
            },
          },
        },

        TO_NOWHERE: {
          token: "account-self/repo-self.tokenD",
          github: {
            repo: {
              actions: false,
              codespaces: false,
              dependabot: false,
              environments: [],
            },
            repos: {},
            account: {
              actions: false,
              codespaces: false,
              dependabot: false,
            },
            accounts: {},
          },
        },
      },
    },
  } satisfies ConsumerConfig);
});

it("parses consumer configs that are just comments", async () => {
  const fixturePath = join(fixturesPath, "just-comments.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(parseConsumerConfig("account-self", "repo-self", yaml)).toEqual({
    $schema: consumerSchema.$id,
    tokens: {},
    provision: { secrets: {} },
  } satisfies ConsumerConfig);
});

it("parses consumer configs that are empty", async () => {
  expect(parseConsumerConfig("account-self", "repo-self", "")).toEqual({
    $schema: consumerSchema.$id,
    tokens: {},
    provision: { secrets: {} },
  } satisfies ConsumerConfig);
});

it("throws when an invalid pattern is used in /provision/secrets/<name>/github/repos/<pattern>", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-pattern-provision-secrets-github-repos-key.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseConsumerConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of consumer configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n\\nprovision:\\n  secrets:\\n    SECRET_A:\\n      token: tokenA\\n      github:\\n        repos:\\n          repo-x:\\n            actions: true\\n"

      Caused by: Invalid consumer configuration:
        - must be a repo pattern in the form of "account/repo", or "./repo" (/provision/secrets/SECRET_A/github/repos)
        - property name must be valid (/provision/secrets/SECRET_A/github/repos)"
    `);
});

it("throws when an invalid token name is defined", async () => {
  const fixturePath = join(fixturesPath, "invalid-token-name.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseConsumerConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of consumer configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n\\ntokens:\\n  invalid.token.name:\\n    repos: [repo-a]\\n    permissions: { contents: read }\\n"

      Caused by: Invalid consumer configuration:
        - must only contain alphanumeric characters, hyphens, or underscores (/tokens)
        - property name must be valid (/tokens)"
    `);
});

it("throws when an invalid secret name is defined", async () => {
  const fixturePath = join(fixturesPath, "invalid-secret-name.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseConsumerConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of consumer configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n\\nprovision:\\n  secrets:\\n    1_INVALID_SECRET_NAME:\\n      token: tokenA\\n      github:\\n        repo:\\n          actions: true\\n"

      Caused by: Invalid consumer configuration:
        - must only contain alphanumeric characters or underscores, and cannot begin with a number (/provision/secrets)
        - property name must be valid (/provision/secrets)"
    `);
});

it("throws when a secret token reference has an empty account", async () => {
  const fixturePath = join(fixturesPath, "empty-token-reference-account.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseConsumerConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of consumer configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n\\nprovision:\\n  secrets:\\n    TO_REPO_ACTIONS:\\n      token: /repo-a.tokenA\\n      github:\\n        repo:\\n          actions: true\\n"

      Caused by: Invalid consumer configuration:
        - must be a token reference in the form of "account/repo.token-name", "./repo.token-name", or "token-name" (/provision/secrets/TO_REPO_ACTIONS/token)"
    `);
});

it("throws when a secret token reference has an invalid account", async () => {
  const fixturePath = join(fixturesPath, "invalid-token-reference-account.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseConsumerConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of consumer configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n\\nprovision:\\n  secrets:\\n    TO_REPO_ACTIONS:\\n      token: account-/repo-a.tokenA\\n      github:\\n        repo:\\n          actions: true\\n"

      Caused by: Invalid consumer configuration:
        - must be a token reference in the form of "account/repo.token-name", "./repo.token-name", or "token-name" (/provision/secrets/TO_REPO_ACTIONS/token)"
    `);
});

it("throws when a secret token reference has an empty repo", async () => {
  const fixturePath = join(fixturesPath, "empty-token-reference-repo.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseConsumerConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of consumer configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n\\nprovision:\\n  secrets:\\n    TO_REPO_ACTIONS:\\n      token: account-a/.tokenA\\n      github:\\n        repo:\\n          actions: true\\n"

      Caused by: Invalid consumer configuration:
        - must be a token reference in the form of "account/repo.token-name", "./repo.token-name", or "token-name" (/provision/secrets/TO_REPO_ACTIONS/token)"
    `);
});

it("throws when a secret token reference has an invalid repo", async () => {
  const fixturePath = join(fixturesPath, "invalid-token-reference-repo.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseConsumerConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of consumer configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n$schema: https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\n\\nprovision:\\n  secrets:\\n    TO_REPO_ACTIONS:\\n      token: account-a/repo-*.tokenA\\n      github:\\n        repo:\\n          actions: true\\n"

      Caused by: Invalid consumer configuration:
        - must be a token reference in the form of "account/repo.token-name", "./repo.token-name", or "token-name" (/provision/secrets/TO_REPO_ACTIONS/token)"
    `);
});

it("throws when there are additional properties", async () => {
  const fixturePath = join(fixturesPath, "additional-properties.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(throws(() => parseConsumerConfig("account-self", "repo-self", yaml)))
    .toMatchInlineSnapshot(`
      "Parsing of consumer configuration failed for "# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json\\nadditional: This should not be allowed\\n"

      Caused by: Invalid consumer configuration:
        - must NOT have additional properties"
    `);
});

it("throws when the YAML is invalid", async () => {
  expect(throws(() => parseConsumerConfig("account-self", "repo-self", "{")))
    .toMatchInlineSnapshot(`
      "Parsing of consumer configuration failed for "{"

      Caused by: unexpected end of the stream within a flow collection (2:1)

       1 | {
       2 |
      -----^"
    `);
});
