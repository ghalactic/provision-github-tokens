import type { InstallationPermissions } from "./github-api.js";

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
};

type RulePermissions = {
  [Property in keyof InstallationPermissions]:
    | InstallationPermissions[Property]
    | "none";
};
