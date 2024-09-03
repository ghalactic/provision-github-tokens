import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { expect, it } from "vitest";
import { parseProviderConfig } from "../../../src/config/provider-config.js";
import providerSchema from "../../../src/schema/provider.v1.schema.json";
import type { ProviderConfig } from "../../../src/type/provider-config.js";

const fixturesPath = fileURLToPath(
  new URL("../../fixture/provider-config", import.meta.url),
);

it("parses comprehensive provider config", async () => {
  const fixturePath = join(fixturesPath, "comprehensive.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(parseProviderConfig(yaml)).toEqual({
    $schema: providerSchema.$id,

    permissions: {
      rules: {
        repositories: [
          {
            description: "Access across all owners and repos",
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
            description: "Access to a specific owner from anywhere",
            resources: ["owner-a/*"],
            consumers: ["*/*"],
            permissions: { metadata: "read" },
          },
          {
            description: "Access to a specific owner the same owner",
            resources: ["owner-a/*"],
            consumers: ["owner-a/*"],
            permissions: { issues: "write" },
          },
          {
            description: "Access within the same owner",
            resources: ["*/*"],
            consumers: ["$OWNER/*"],
            permissions: { issues: "write", pull_requests: "write" },
          },
          {
            description: "Access to same-named repos (weird, but possible)",
            resources: ["*/*"],
            consumers: ["*/$REPO"],
            permissions: { metadata: "read" },
          },
          {
            description: "Self-access",
            resources: ["*/*"],
            consumers: ["$OWNER/$REPO"],
            permissions: { contents: "write", metadata: "write" },
          },
          {
            description:
              "Access to repos with a specific name in any owner (weird, but possible)",
            resources: ["*/repo-a"],
            consumers: ["*/*"],
            permissions: { metadata: "read" },
          },
          {
            description: "Cross-repo access (in the provider's owner)",
            resources: ["repo-a"],
            consumers: ["repo-b"],
            permissions: { contents: "read" },
          },
          {
            description: "All-repo access (in the provider's owner)",
            resources: ["*"],
            consumers: ["repo-a"],
            permissions: { contents: "read" },
          },
          {
            description: "Cross-owner access",
            resources: ["owner-a/repo-a"],
            consumers: ["owner-b/repo-b"],
            permissions: { contents: "read" },
          },
          {
            description: "Revocation of access",
            resources: ["repo-a"],
            consumers: ["repo-b"],
            permissions: { contents: "none" },
          },
          {
            description: "Escalation of access",
            resources: ["repo-a"],
            consumers: ["repo-b"],
            permissions: { contents: "write" },
          },
          {
            description: "De-escalation of access",
            resources: ["repo-a"],
            consumers: ["repo-b"],
            permissions: { contents: "read" },
          },
          {
            description: "Multiple resources and consumers",
            resources: ["repo-a", "repo-b"],
            consumers: ["repo-c", "repo-d"],
            permissions: { contents: "read" },
          },
          {
            description: "Wildcards",
            resources: ["owner-*/repo-*"],
            consumers: ["*-owner/*-repo"],
            permissions: { contents: "read" },
          },
          {
            description: "All permissions",
            resources: ["repo-a"],
            consumers: ["repo-b"],
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
  } satisfies ProviderConfig);
});

it("parses provider configs that are just comments", async () => {
  const fixturePath = join(fixturesPath, "just-comments.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(parseProviderConfig(yaml)).toEqual({
    $schema: providerSchema.$id,
    permissions: { rules: { repositories: [] } },
  } satisfies ProviderConfig);
});

it("parses provider configs that are empty", async () => {
  expect(parseProviderConfig("")).toEqual({
    $schema: providerSchema.$id,
    permissions: { rules: { repositories: [] } },
  } satisfies ProviderConfig);
});

it("throws when there are additional properties", async () => {
  const fixturePath = join(fixturesPath, "additional-properties.yml");
  const yaml = await readFile(fixturePath, "utf-8");

  expect(() => parseProviderConfig(yaml)).toThrow(/additional properties/i);
});

it("throws when the YAML is invalid", async () => {
  expect(() => parseProviderConfig("{")).toThrow(/parsing/i);
});
