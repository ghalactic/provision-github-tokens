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
  types: ProviderConfigGitHubAccountSecretTypes;
};

export type ProviderConfigGitHubRepoTarget = {
  visibility: Visibility;
  types: ProviderConfigGitHubRepoSecretTypes;
};

export type ProviderConfigGitHubAccountSecretTypes = {
  actions?: ProviderConfigGitHubAccountSecretVisibilityDecisions;
  agents?: ProviderConfigGitHubAccountSecretVisibilityDecisions;
  codespaces?: ProviderConfigGitHubAccountSecretVisibilityDecisions;
  dependabot?: ProviderConfigGitHubAccountSecretVisibilityDecisions;
};

export type ProviderConfigGitHubAccountSecretVisibilityDecisions = {
  allRepos?: "allow" | "deny";
  privateRepos?: "allow" | "deny";
  selectedRepos?: "allow" | "deny";
  noRepos?: "allow" | "deny";
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
