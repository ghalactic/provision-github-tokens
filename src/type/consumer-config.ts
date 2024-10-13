import type {
  GitHubOrganizationSecretTypes,
  GitHubRepositorySecretTypes,
} from "./github-secret-type.js";
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
          organization: GitHubOrganizationSecretTypes;
          organizations: Record<string, GitHubOrganizationSecretTypes>;
          repository: GitHubRepositorySecretTypes;
          repositories: Record<string, GitHubRepositorySecretTypes>;
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
