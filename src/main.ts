/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, setFailed } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { readAppsInput } from "./config/apps-input.js";
import { discoverApps } from "./discover-apps.js";
import { discoverConsumers } from "./discover-consumers.js";
import { errorMessage } from "./error.js";
import { createNamePattern } from "./name-pattern.js";
import { createOctokitFactory } from "./octokit.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";
import { registerTokenDeclarations } from "./register-token-declarations.js";
import { createTokenDeclarationRegistry } from "./token-declaration-registry.js";
import type { ProviderProvisionConfig } from "./type/provider-config.js";
import type { ProvisionRequest } from "./type/provision-request.js";

main().catch((error) => {
  setFailed(errorMessage(error));
});

async function main(): Promise<void> {
  const appsInput = readAppsInput();

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  const declarationRegistry = createTokenDeclarationRegistry();
  const provisionAuthorizer = createProvisionAuthorizer(
    {} as ProviderProvisionConfig,
  );

  await group("Discovering apps", async () => {
    await discoverApps(octokitFactory, appRegistry, appsInput);
  });

  const consumers = await group("Discovering consumers", async () => {
    return discoverConsumers(octokitFactory, appRegistry, appsInput);
  });

  registerTokenDeclarations(declarationRegistry, consumers);

  // TODO: generate token requests
  // TODO: generate provision requests
  // TODO: authorize tokens
  // TODO: authorize provisioning
  // TODO: issue tokens
  // TODO: provision secrets

  for (const [, requester] of consumers) {
    const provisionRequests: ProvisionRequest[] = [];

    for (const secretName in requester.config.provision.secrets) {
      const secretDec = requester.config.provision.secrets[secretName];

      for (const typeString of ["actions", "codespaces", "dependabot"]) {
        const type = typeString as "actions" | "codespaces" | "dependabot";

        if (secretDec.github.account[type]) {
          provisionRequests.push({
            name: secretName,
            platform: "github",
            account: requester.account,
            type,
          });
        }

        for (const accountPattern in secretDec.github.accounts[type]) {
          for (const account of appRegistry.resolveAccounts(
            createNamePattern(accountPattern),
          )) {
            provisionRequests.push({
              name: secretName,
              platform: "github",
              account,
              type,
            });
          }
        }
      }
    }

    for (const request of provisionRequests) {
      const result = provisionAuthorizer.authorizeSecret(
        `${requester.account}/${requester.repo}`,
        request,
      );
    }
  }
}
/* v8 ignore stop */
