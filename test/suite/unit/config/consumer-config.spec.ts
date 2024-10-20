import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { expect, it } from "vitest";
import { parseConsumerConfig } from "../../../../src/config/consumer-config.js";
import consumerSchema from "../../../../src/schema/consumer.v1.schema.json";
import type { ConsumerConfig } from "../../../../src/type/consumer-config.js";

const fixturesPath = fileURLToPath(
  new URL("../../../fixture/consumer-config", import.meta.url),
);

it("parses comprehensive consumer config", async () => {
  const fixturePath = join(fixturesPath, "comprehensive.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(parseConsumerConfig("owner-self", "repo-self", yaml)).toEqual({
    $schema: consumerSchema.$id,

    tokens: {
      oneRepOnePerm: {
        shared: false,
        as: undefined,
        owner: "owner-self",
        repos: ["repo-a"],
        permissions: { contents: "read" },
      },

      multiRepoMultiPerm: {
        shared: false,
        as: undefined,
        owner: "owner-self",
        repos: ["repo-a", "repo-b"],
        permissions: { contents: "read", metadata: "read" },
      },

      withSharedFalse: {
        shared: false,
        as: undefined,
        owner: "owner-self",
        repos: ["repo-a"],
        permissions: { contents: "read" },
      },

      withSharedTrue: {
        shared: true,
        as: undefined,
        owner: "owner-self",
        repos: ["repo-a"],
        permissions: { contents: "read" },
      },

      withAs: {
        shared: false,
        as: "role-a",
        owner: "owner-self",
        repos: ["repo-a"],
        permissions: { contents: "write" },
      },

      withOwner: {
        shared: false,
        as: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: { contents: "read" },
      },

      withAllOptions: {
        shared: true,
        as: "role-a",
        owner: "owner-a",
        repos: ["repo-a", "repo-*"],
        permissions: { contents: "write", metadata: "read" },
      },

      withAllPermissions: {
        shared: false,
        as: "role-a",
        owner: "owner-self",
        repos: ["*"],
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
          token: "owner-self/repo-self.tokenA",
          github: {
            repo: {
              actions: true,
              codespaces: false,
              dependabot: false,
              environments: [],
            },
            repos: {},
            org: {
              actions: false,
              codespaces: false,
              dependabot: false,
            },
            orgs: {},
          },
        },

        TO_ORG_DEPENDABOT: {
          token: "owner-self/other-repo.tokenB",
          github: {
            repo: {
              actions: false,
              codespaces: false,
              dependabot: false,
              environments: [],
            },
            repos: {},
            org: {
              actions: false,
              codespaces: false,
              dependabot: true,
            },
            orgs: {},
          },
        },

        TO_EVERYWHERE: {
          token: "other-org/repo.tokenC",
          github: {
            org: { actions: true, codespaces: true, dependabot: true },
            orgs: {
              "org-a": { actions: true, codespaces: false, dependabot: false },
              "org-b": { actions: true, codespaces: true, dependabot: true },
            },
            repo: {
              actions: true,
              codespaces: true,
              dependabot: true,
              environments: ["env-a", "env-b"],
            },
            repos: {
              "owner-self/repo-a": {
                actions: true,
                codespaces: false,
                dependabot: false,
                environments: [],
              },
              "owner-a/repo-a": {
                actions: true,
                codespaces: true,
                dependabot: true,
                environments: ["env-a", "env-b"],
              },
            },
          },
        },

        TO_NOWHERE: {
          token: "owner-self/repo-self.tokenD",
          github: {
            repo: {
              actions: false,
              codespaces: false,
              dependabot: false,
              environments: [],
            },
            repos: {},
            org: {
              actions: false,
              codespaces: false,
              dependabot: false,
            },
            orgs: {},
          },
        },
      },
    },
  } satisfies ConsumerConfig);
});

it("parses consumer configs that are just comments", async () => {
  const fixturePath = join(fixturesPath, "just-comments.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(parseConsumerConfig("owner-self", "repo-self", yaml)).toEqual({
    $schema: consumerSchema.$id,
    tokens: {},
    provision: { secrets: {} },
  } satisfies ConsumerConfig);
});

it("parses consumer configs that are empty", async () => {
  expect(parseConsumerConfig("owner-self", "repo-self", "")).toEqual({
    $schema: consumerSchema.$id,
    tokens: {},
    provision: { secrets: {} },
  } satisfies ConsumerConfig);
});

it("throws when an invalid token name is defined", async () => {
  const fixturePath = join(fixturesPath, "invalid-token-name.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(() => parseConsumerConfig("owner-self", "repo-self", yaml)).toThrow(
    /property name must be valid \(\/tokens\)/i,
  );
});

it("throws when an invalid secret name is defined", async () => {
  const fixturePath = join(fixturesPath, "invalid-secret-name.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(() => parseConsumerConfig("owner-self", "repo-self", yaml)).toThrow(
    /property name must be valid \(\/provision\/secrets\)/i,
  );
});

it("throws when an secret token reference has an empty owner", async () => {
  const fixturePath = join(fixturesPath, "empty-token-reference-owner.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(() => parseConsumerConfig("owner-self", "repo-self", yaml)).toThrow(
    /must match pattern .* \(\/provision\/secrets\/TO_REPO_ACTIONS\/token\)/,
  );
});

it("throws when an secret token reference has an invalid owner", async () => {
  const fixturePath = join(fixturesPath, "invalid-token-reference-owner.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(() => parseConsumerConfig("owner-self", "repo-self", yaml)).toThrow(
    /must match pattern .* \(\/provision\/secrets\/TO_REPO_ACTIONS\/token\)/,
  );
});

it("throws when an secret token reference has an empty repo", async () => {
  const fixturePath = join(fixturesPath, "empty-token-reference-repo.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(() => parseConsumerConfig("owner-self", "repo-self", yaml)).toThrow(
    /must match pattern .* \(\/provision\/secrets\/TO_REPO_ACTIONS\/token\)/,
  );
});

it("throws when an secret token reference has an invalid repo", async () => {
  const fixturePath = join(fixturesPath, "invalid-token-reference-repo.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(() => parseConsumerConfig("owner-self", "repo-self", yaml)).toThrow(
    /must match pattern .* \(\/provision\/secrets\/TO_REPO_ACTIONS\/token\)/,
  );
});

it("throws when there are additional properties", async () => {
  const fixturePath = join(fixturesPath, "additional-properties.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(() => parseConsumerConfig("owner-self", "repo-self", yaml)).toThrow(
    /additional properties/i,
  );
});

it("throws when the YAML is invalid", async () => {
  expect(() => parseConsumerConfig("owner-self", "repo-self", "{")).toThrow(
    /parsing/i,
  );
});
