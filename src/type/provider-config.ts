import type { PermissionsRule } from "./permissions-rule.js";
import type { ProvisionSecretsRule } from "./provision-rule.js";

export type ProviderConfig = {
  $schema?: string;
  dashboards: ProviderDashboardsConfig;
  permissions: ProviderPermissionsConfig;
  provision: ProviderProvisionConfig;
};

export type ProviderDashboardsConfig = {
  enabled: boolean;
};

export type ProviderPermissionsConfig = {
  rules: PermissionsRule[];
};

export type ProviderProvisionConfig = {
  rules: {
    secrets: ProvisionSecretsRule[];
  };
};
