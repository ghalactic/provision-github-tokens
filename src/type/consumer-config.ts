import type { InstallationPermissions } from "./github-api.js";
import type {
  GitHubOrganizationSecretTypes,
  GitHubRepositorySecretTypes,
} from "./github-secret-type.js";

export type PartialConsumerConfig = {
  $schema: string;
  tokens: Record<
    string,
    {
      shared: boolean;
      as?: string;
      owner?: string;
      repositories: string[];
      permissions: InstallationPermissions;
    }
  >;
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
