import type { InstallationPermissions } from "./github-api.js";
import type {
  GitHubOrganizationSecretTypes,
  GitHubRepositorySecretTypes,
} from "./github-secret-type.js";

export type ProviderConfig = {
  $schema?: string;
  permissions: {
    rules: {
      repositories: {
        description?: string;
        resources: string[];
        consumers: string[];
        permissions: RulePermissions;
      }[];
    };
  };
  provision: {
    rules: {
      secrets: {
        description?: string;
        secrets: string[];
        requesters: string[];
        allow: {
          github: {
            organization: GitHubOrganizationSecretTypes;
            organizations: Record<string, GitHubOrganizationSecretTypes>;
            repository: GitHubRepositorySecretTypes;
            repositories: Record<string, GitHubRepositorySecretTypes>;
          };
        };
        deny: {
          github: {
            organization: GitHubOrganizationSecretTypes;
            organizations: Record<string, GitHubOrganizationSecretTypes>;
            repository: GitHubRepositorySecretTypes;
            repositories: Record<string, GitHubRepositorySecretTypes>;
          };
        };
      }[];
    };
  };
};

type RulePermissions = {
  [Property in keyof InstallationPermissions]:
    | InstallationPermissions[Property]
    | "none";
};
