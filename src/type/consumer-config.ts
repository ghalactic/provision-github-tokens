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
          account: ConsumerConfigGitHubAccountSecretTypes;
          accounts: Record<string, ConsumerConfigGitHubAccountSecretTypes>;
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

type ConsumerConfigGitHubAccountSecretTypes = {
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
