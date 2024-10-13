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
            organization: ProviderConfigGitHubOrganizationSecretTypes;
            organizations: Record<
              string,
              ProviderConfigGitHubOrganizationSecretTypes
            >;
            repository: ProviderConfigGitHubRepositorySecretTypes;
            repositories: Record<
              string,
              ProviderConfigGitHubRepositorySecretTypes
            >;
          };
        };
      }[];
    };
  };
};

export type ProviderPermissionsConfig = {
  rules: PermissionsRules;
};

type ProviderConfigGitHubOrganizationSecretTypes = {
  actions?: "allow" | "deny";
  codespaces?: "allow" | "deny";
  dependabot?: "allow" | "deny";
};

type ProviderConfigGitHubRepositorySecretTypes = {
  actions?: "allow" | "deny";
  codespaces?: "allow" | "deny";
  dependabot?: "allow" | "deny";
  environments: Record<string, "allow" | "deny">;
};
