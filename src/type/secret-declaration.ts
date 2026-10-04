export type SecretDeclaration = {
  token: string;
  github: {
    account: SecretDeclarationGitHubAccountSecretTypes;
    accounts: Record<string, SecretDeclarationGitHubAccountSecretTypes>;
    repo: SecretDeclarationGitHubRepoSecretTypes;
    repos: Record<string, SecretDeclarationGitHubRepoSecretTypes>;
  };
};

export type SecretDeclarationGitHubAccountSecretTypes = {
  actions?: SecretDeclarationGitHubAccountSecretSetting;
  agents?: SecretDeclarationGitHubAccountSecretSetting;
  codespaces?: SecretDeclarationGitHubAccountSecretSetting;
  dependabot?: SecretDeclarationGitHubAccountSecretSetting;
};

export type SecretDeclarationGitHubAccountSecretSetting =
  SecretDeclarationGitHubAccountSecretVisibility | false;

export type SecretDeclarationGitHubAccountSecretVisibility =
  "private" | "all" | string[];

export type SecretDeclarationGitHubRepoSecretTypes = {
  actions?: boolean;
  agents?: boolean;
  codespaces?: boolean;
  dependabot?: boolean;
  environments: string[];
};
