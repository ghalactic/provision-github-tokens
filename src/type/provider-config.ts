import type { PermissionsRule } from "./permissions-rule.js";
import type { ProvisionSecretsRule } from "./provision-rule.js";

export type ProviderConfig = {
  $schema?: string;
  permissions: ProviderPermissionsConfig;
  provision: ProviderProvisionConfig;
};

export type ProviderPermissionsConfig = {
  rules: PermissionsRule[];
};

export type ProviderProvisionConfig = {
  rules: {
    secrets: ProvisionSecretsRule[];
  };
};
