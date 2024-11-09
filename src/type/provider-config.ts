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
            account: ProviderConfigGitHubAccountSecretTypes;
            accounts: Record<string, ProviderConfigGitHubAccountSecretTypes>;
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

type ProviderConfigGitHubAccountSecretTypes = {
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
