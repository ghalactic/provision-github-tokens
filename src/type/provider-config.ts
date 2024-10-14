import type { InstallationPermissions } from "./github-api.js";

export type ProviderConfig = {
  $schema?: string;
  permissions: {
    rules: {
      repositories: {
        description?: string;
        resources: string[];
        consumers: string[];
        permissions: RulePermissions;
      }[];
    };
  };
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

type RulePermissions = {
  [Property in keyof InstallationPermissions]:
    | InstallationPermissions[Property]
    | "none";
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
