export type ProvisionSecretsRule = {
  description?: string;
  secrets: string[];
  requesters: string[];
  to: {
    github: {
      account: ProviderConfigGitHubSecretTypes;
      accounts: Record<string, ProviderConfigGitHubSecretTypes>;
      repo: ProviderConfigGitHubRepoSecretTypes;
      repos: Record<string, ProviderConfigGitHubRepoSecretTypes>;
    };
  };
};

export type ProviderConfigGitHubSecretTypes = {
  actions?: "allow" | "deny";
  codespaces?: "allow" | "deny";
  dependabot?: "allow" | "deny";
};

type ProviderConfigGitHubRepoSecretTypes = ProviderConfigGitHubSecretTypes & {
  environments: Record<string, "allow" | "deny">;
};
