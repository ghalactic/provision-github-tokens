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
  actions?: boolean;
  codespaces?: boolean;
  dependabot?: boolean;
};

export type SecretDeclarationGitHubRepoSecretTypes = {
  actions?: boolean;
  codespaces?: boolean;
  dependabot?: boolean;
  environments: string[];
};
