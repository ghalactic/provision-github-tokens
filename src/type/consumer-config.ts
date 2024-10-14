import type { TokenDeclaration } from "./token-declaration.js";

export type PartialConsumerConfig = {
  $schema: string;
  tokens: Record<string, TokenDeclaration>;
  provision: {
    secrets: Record<
      string,
      {
        token: string;
        github: {
          organization: ConsumerConfigGitHubOrganizationSecretTypes;
          organizations: Record<
            string,
            ConsumerConfigGitHubOrganizationSecretTypes
          >;
          repository: ConsumerConfigGitHubRepositorySecretTypes;
          repositories: Record<
            string,
            ConsumerConfigGitHubRepositorySecretTypes
          >;
        };
      }
    >;
  };
};

export type ConsumerConfig = PartialConsumerConfig & {
  $schema: string;
  tokens: Record<
    string,
    PartialConsumerConfig["tokens"][string] & { owner: string }
  >;
};

type ConsumerConfigGitHubOrganizationSecretTypes = {
  actions: boolean;
  codespaces: boolean;
  dependabot: boolean;
};

type ConsumerConfigGitHubRepositorySecretTypes = {
  actions: boolean;
  codespaces: boolean;
  dependabot: boolean;
  environments: string[];
};
