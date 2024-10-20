import type { PermissionsRules } from "./permission-rule.js";

export type ProviderConfig = {
  $schema?: string;
  permissions: ProviderPermissionsConfig;
  provision: {
    rules: {
      secrets: {
        description?: string;
        secrets: string[];
        requesters: string[];
        to: {
          github: {
            org: ProviderConfigGitHubOrgSecretTypes;
            orgs: Record<string, ProviderConfigGitHubOrgSecretTypes>;
            repo: ProviderConfigGitHubRepoSecretTypes;
            repos: Record<string, ProviderConfigGitHubRepoSecretTypes>;
          };
        };
      }[];
    };
  };
};

export type ProviderPermissionsConfig = {
  rules: PermissionsRules;
};

type ProviderConfigGitHubOrgSecretTypes = {
  actions?: "allow" | "deny";
  codespaces?: "allow" | "deny";
  dependabot?: "allow" | "deny";
};

type ProviderConfigGitHubRepoSecretTypes = {
  actions?: "allow" | "deny";
  codespaces?: "allow" | "deny";
  dependabot?: "allow" | "deny";
  environments: Record<string, "allow" | "deny">;
};
