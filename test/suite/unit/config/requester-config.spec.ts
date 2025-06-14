import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { expect, it, vi } from "vitest";
import { parseRequesterConfig } from "../../../../src/config/requester-config.js";
import requesterSchema from "../../../../src/schema/requester.v1.schema.json" with { type: "json" };
import type { RequesterConfig } from "../../../../src/type/requester-config.js";
import { throws } from "../../../error.js";

vi.mock("@actions/core");

const fixturesPath = fileURLToPath(
  new URL("../../../fixture/requester-config", import.meta.url),
);

it("parses comprehensive requester config", async () => {
  const fixturePath = join(fixturesPath, "comprehensive.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    parseRequesterConfig({ account: "account-self", repo: "repo-self" }, yaml),
  ).toEqual({
    $schema: requesterSchema.$id,

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
              environments: [],
            },
            repos: {},
            account: {},
            accounts: {},
          },
        },

        TO_ACCOUNT_DEPENDABOT: {
          token: "account-self/other-repo.tokenB",
          github: {
            repo: {
              environments: [],
            },
            repos: {},
            account: {
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
              environments: [],
            },
            repos: {},
            account: {},
            accounts: {},
          },
        },

        TO_NOWHERE_EXPLICIT: {
          token: "account-self/repo-self.tokenE",
          github: {
            repo: {
              dependabot: false,
              codespaces: false,
              actions: false,
              environments: [],
            },
            account: {
              dependabot: false,
              codespaces: false,
              actions: false,
            },
            accounts: {
              "*": {
                dependabot: false,
                codespaces: false,
                actions: false,
              },
            },
            repos: {
              "*/*": {
                dependabot: false,
                codespaces: false,
                actions: false,
                environments: [],
              },
            },
          },
        },
      },
    },
  } satisfies RequesterConfig);
});

it("parses requester configs that are just comments", async () => {
  const fixturePath = join(fixturesPath, "just-comments.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    parseRequesterConfig({ account: "account-self", repo: "repo-self" }, yaml),
  ).toEqual({
    $schema: requesterSchema.$id,
    tokens: {},
    provision: { secrets: {} },
  } satisfies RequesterConfig);
});

it("parses requester configs that are empty", async () => {
  expect(
    parseRequesterConfig({ account: "account-self", repo: "repo-self" }, ""),
  ).toEqual({
    $schema: requesterSchema.$id,
    tokens: {},
    provision: { secrets: {} },
  } satisfies RequesterConfig);
});

it("throws when an invalid token name is defined", async () => {
  const fixturePath = join(fixturesPath, "invalid-token-name.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseRequesterConfig(
        { account: "account-self", repo: "repo-self" },
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
      "Parsing of requester configuration failed

      Caused by: Invalid requester configuration:
        - must only contain alphanumeric characters, hyphens, or underscores (/tokens)
        - property name must be valid (/tokens)"
    `);
});

it("throws when empty permissions are specified", async () => {
  const fixturePath = join(fixturesPath, "empty-permissions.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseRequesterConfig(
        { account: "account-self", repo: "repo-self" },
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
      "Parsing of requester configuration failed

      Caused by: Invalid requester configuration:
        - must NOT have fewer than 1 properties (/tokens/emptyPermissions/permissions)"
    `);
});

it("throws when an invalid pattern is used in /provision/secrets/<name>/github/repos/<pattern>", async () => {
  const fixturePath = join(
    fixturesPath,
    "invalid-pattern-provision-secrets-github-repos-key.yml",
  );
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseRequesterConfig(
        { account: "account-self", repo: "repo-self" },
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
      "Parsing of requester configuration failed

      Caused by: Invalid requester configuration:
        - must be a repo pattern in the form of "account/repo", or "./repo" (/provision/secrets/SECRET_A/github/repos)
        - property name must be valid (/provision/secrets/SECRET_A/github/repos)"
    `);
});

it("throws when an invalid secret name is defined", async () => {
  const fixturePath = join(fixturesPath, "invalid-secret-name.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseRequesterConfig(
        { account: "account-self", repo: "repo-self" },
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
      "Parsing of requester configuration failed

      Caused by: Invalid requester configuration:
        - must only contain alphanumeric characters or underscores, and cannot begin with a number (/provision/secrets)
        - property name must be valid (/provision/secrets)"
    `);
});

it("throws when a secret token reference has an empty account", async () => {
  const fixturePath = join(fixturesPath, "empty-token-reference-account.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseRequesterConfig(
        { account: "account-self", repo: "repo-self" },
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
      "Parsing of requester configuration failed

      Caused by: Invalid requester configuration:
        - must be a token reference in the form of "account/repo.token-name", "./repo.token-name", or "token-name" (/provision/secrets/TO_REPO_ACTIONS/token)"
    `);
});

it("throws when a secret token reference has an invalid account", async () => {
  const fixturePath = join(fixturesPath, "invalid-token-reference-account.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseRequesterConfig(
        { account: "account-self", repo: "repo-self" },
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
      "Parsing of requester configuration failed

      Caused by: Invalid requester configuration:
        - must be a token reference in the form of "account/repo.token-name", "./repo.token-name", or "token-name" (/provision/secrets/TO_REPO_ACTIONS/token)"
    `);
});

it("throws when a secret token reference has an empty repo", async () => {
  const fixturePath = join(fixturesPath, "empty-token-reference-repo.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseRequesterConfig(
        { account: "account-self", repo: "repo-self" },
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
      "Parsing of requester configuration failed

      Caused by: Invalid requester configuration:
        - must be a token reference in the form of "account/repo.token-name", "./repo.token-name", or "token-name" (/provision/secrets/TO_REPO_ACTIONS/token)"
    `);
});

it("throws when a secret token reference has an invalid repo", async () => {
  const fixturePath = join(fixturesPath, "invalid-token-reference-repo.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseRequesterConfig(
        { account: "account-self", repo: "repo-self" },
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
      "Parsing of requester configuration failed

      Caused by: Invalid requester configuration:
        - must be a token reference in the form of "account/repo.token-name", "./repo.token-name", or "token-name" (/provision/secrets/TO_REPO_ACTIONS/token)"
    `);
});

it("throws when there are additional properties", async () => {
  const fixturePath = join(fixturesPath, "additional-properties.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(
    throws(() =>
      parseRequesterConfig(
        { account: "account-self", repo: "repo-self" },
        yaml,
      ),
    ),
  ).toMatchInlineSnapshot(`
      "Parsing of requester configuration failed

      Caused by: Invalid requester configuration:
        - must NOT have additional properties"
    `);
});

it("throws when the YAML is invalid", async () => {
  expect(
    throws(() =>
      parseRequesterConfig({ account: "account-self", repo: "repo-self" }, "{"),
    ),
  ).toMatchInlineSnapshot(`
      "Parsing of requester configuration failed

      Caused by: unexpected end of the stream within a flow collection (2:1)

       1 | {
       2 |
      -----^"
    `);
});
