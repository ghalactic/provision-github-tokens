import {
  createTokenAuthorizer,
  type TokenAuthorizer,
} from "../src/token-authorizer.js";
import type { Permissions } from "../src/type/permissions.js";

export function createTestTokenAuthorizer(
  permissions: Permissions,
): TokenAuthorizer {
  return createTokenAuthorizer({
    rules: [
      {
        description: "<description>",
        resources: [
          {
            accounts: ["*"],
            noRepos: true,
            allRepos: true,
            selectedRepos: ["*"],
          },
        ],
        consumers: ["*", "*/*"],
        permissions,
      },
    ],
  });
}
