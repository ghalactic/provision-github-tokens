/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, setFailed } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { createAuthorizer } from "./authorizer.js";
import { readAppsInput } from "./config/apps-input.js";
import { discoverApps } from "./discover-apps.js";
import { discoverRequesters } from "./discover-requesters.js";
import { createEnvironmentResolver } from "./environment-resolver.js";
import { errorStack } from "./error.js";
import { createOctokitFactory } from "./octokit.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";
import { createProvisionRequestFactory } from "./provision-request.js";
import { registerTokenDeclarations } from "./register-token-declarations.js";
import { createTokenAuthorizer } from "./token-authorizer.js";
import { createTokenDeclarationRegistry } from "./token-declaration-registry.js";
import { createTokenRequestFactory } from "./token-request.js";
import type { ProviderConfig } from "./type/provider-config.js";

main().catch((error) => {
  setFailed(errorStack(error));
});

async function main(): Promise<void> {
  const appsInput = readAppsInput();

  const config = await group("Reading provider configuration", async () => {
    // TODO: read from GitHub API
    const config: ProviderConfig = {
      permissions: {
        rules: [
          {
            description: "Allow all tokens",
            resources: [
              {
                accounts: ["*"],
                noRepos: true,
                allRepos: true,
                selectedRepos: ["*"],
              },
            ],
            consumers: ["*", "*/*"],
            permissions: {
              metadata: "read",
            },
          },
        ],
      },
      provision: {
        rules: {
          secrets: [
            {
              description: "Allow all secrets",
              secrets: ["*"],
              requesters: ["*/*"],
              to: {
                github: {
                  account: {},
                  accounts: {
                    "*": {
                      actions: "allow",
                      codespaces: "allow",
                      dependabot: "allow",
                    },
                  },
                  repo: { environments: {} },
                  repos: {
                    "*/*": {
                      actions: "allow",
                      codespaces: "allow",
                      dependabot: "allow",
                      environments: { "*": "allow" },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    };

    return config;
  });

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createEnvironmentResolver(
    octokitFactory,
    appRegistry,
    appsInput,
  );
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );
  const createTokenRequest = createTokenRequestFactory(appRegistry);
  const tokenAuthorizer = createTokenAuthorizer(config.permissions);
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    config.provision,
  );
  const authorizer = createAuthorizer(
    createProvisionRequest,
    provisionAuthorizer,
    tokenAuthorizer,
  );

  await group("Discovering apps", async () => {
    await discoverApps(octokitFactory, appRegistry, appsInput);
  });

  const requesters = await group("Discovering requesters", async () => {
    return discoverRequesters(octokitFactory, appRegistry, appsInput);
  });

  registerTokenDeclarations(declarationRegistry, requesters);

  await group("Authorizing requests", async () => {
    await authorizer.authorize(Array.from(requesters.values()));
  });

  // TODO: issue tokens
  // TODO: provision secrets
}
/* v8 ignore stop */
