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
          org: ConsumerConfigGitHubOrgSecretTypes;
          orgs: Record<string, ConsumerConfigGitHubOrgSecretTypes>;
          repo: ConsumerConfigGitHubRepoSecretTypes;
          repos: Record<string, ConsumerConfigGitHubRepoSecretTypes>;
        };
      }
    >;
  };
};

export type ConsumerConfig = PartialConsumerConfig & {
  $schema: string;
  tokens: Record<
    string,
    PartialConsumerConfig["tokens"][string] & { account: string }
  >;
};

type ConsumerConfigGitHubOrgSecretTypes = {
  actions: boolean;
  codespaces: boolean;
  dependabot: boolean;
};

type ConsumerConfigGitHubRepoSecretTypes = {
  actions: boolean;
  codespaces: boolean;
  dependabot: boolean;
  environments: string[];
};
