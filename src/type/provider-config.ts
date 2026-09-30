import type {
  PartialPermissionsRule,
  PermissionsRule,
} from "./permissions-rule.js";
import type { ProvisionSecretsRule } from "./provision-rule.js";

export type PartialProviderConfig = {
  $schema?: string;
  dashboards: ProviderDashboardsConfig;
  permissions: PartialProviderPermissionsConfig;
  provision: ProviderProvisionConfig;
};

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

export type PartialProviderPermissionsConfig = {
  rules: PartialPermissionsRule[];
};

export type ProviderProvisionConfig = {
  rules: {
    secrets: ProvisionSecretsRule[];
  };
};
