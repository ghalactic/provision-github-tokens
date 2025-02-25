export type SecretDeclaration = {
  token: string;
  github: {
    account: SecretDeclarationGitHubAccountSecretTypes;
    accounts: Record<string, SecretDeclarationGitHubAccountSecretTypes>;
    repo: SecretDeclarationGitHubRepoSecretTypes;
    repos: Record<string, SecretDeclarationGitHubRepoSecretTypes>;
  };
};

type SecretDeclarationGitHubAccountSecretTypes = {
  actions: boolean;
  codespaces: boolean;
  dependabot: boolean;
};

type SecretDeclarationGitHubRepoSecretTypes = {
  actions: boolean;
  codespaces: boolean;
  dependabot: boolean;
  environments: string[];
};
