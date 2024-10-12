export type GitHubOrganizationSecretTypes = {
  actions: boolean;
  codespaces: boolean;
  dependabot: boolean;
};

export type GitHubRepositorySecretTypes = {
  actions: boolean;
  codespaces: boolean;
  dependabot: boolean;
  environments: string[];
};
