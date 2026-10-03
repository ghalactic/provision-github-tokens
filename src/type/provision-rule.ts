import type { Visibility } from "./visibility.js";

export type ProvisionSecretsRule = {
  description?: string;
  secrets: string[];
  requesters: string[];
  to: {
    github: {
      account: ProviderConfigGitHubAccountTarget;
      accounts: Record<string, ProviderConfigGitHubAccountTarget>;
      repo: ProviderConfigGitHubRepoTarget;
      repos: Record<string, ProviderConfigGitHubRepoTarget>;
    };
  };
};

export type ProviderConfigGitHubAccountTarget = {
  types: ProviderConfigGitHubSecretTypes;
};

export type ProviderConfigGitHubRepoTarget = {
  visibility: Visibility;
  types: ProviderConfigGitHubRepoSecretTypes;
};

export type ProviderConfigGitHubSecretTypes = {
  actions?: "allow" | "deny";
  agents?: "allow" | "deny";
  codespaces?: "allow" | "deny";
  dependabot?: "allow" | "deny";
};

export type ProviderConfigGitHubRepoSecretTypes =
  ProviderConfigGitHubSecretTypes & {
    environments: Record<string, "allow" | "deny">;
  };
