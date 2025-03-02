/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, setFailed } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { readAppsInput } from "./config/apps-input.js";
import { discoverApps } from "./discover-apps.js";
import { discoverConsumers } from "./discover-consumers.js";
import { errorStack } from "./error.js";
import { createNamePattern } from "./name-pattern.js";
import { createOctokitFactory } from "./octokit.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";
import { registerTokenDeclarations } from "./register-token-declarations.js";
import { createTokenDeclarationRegistry } from "./token-declaration-registry.js";
import type { ProviderConfig } from "./type/provider-config.js";
import type { ProvisionAuthResult } from "./type/provision-auth-result.js";
import type { ProvisionRequest } from "./type/provision-request.js";

main().catch((error) => {
  setFailed(errorStack(error));
});

async function main(): Promise<void> {
  const appsInput = readAppsInput();

  const config = await group("Reading provider configuration", async () => {
    // TODO: read from file
    const config: ProviderConfig = {
      permissions: { rules: [] },
      provision: {
        rules: {
          secrets: [
            {
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
                      environments: {},
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
  const provisionAuthorizer = createProvisionAuthorizer(config.provision);

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
    const platform = "github";

    for (const name in requester.config.provision.secrets) {
      const secretDec = requester.config.provision.secrets[name];

      for (const type of ["actions", "codespaces", "dependabot"] as const) {
        if (secretDec.github.account[type]) {
          const { account } = requester;
          provisionRequests.push({ name, platform, account, type });
        }
      }

      for (const accountPattern in secretDec.github.accounts) {
        const accounts = appRegistry.resolveProvisionerAccounts(
          createNamePattern(accountPattern),
        );

        for (const type of ["actions", "codespaces", "dependabot"] as const) {
          if (secretDec.github.accounts[accountPattern][type]) {
            for (const account of accounts) {
              provisionRequests.push({ name, platform, type, account });
            }
          }
        }
      }

      for (const type of ["actions", "codespaces", "dependabot"] as const) {
        if (secretDec.github.repo[type]) {
          const { account, repo } = requester;
          provisionRequests.push({ name, platform, type, account, repo });
        }
      }

      for (const envPattern of secretDec.github.repo.environments) {
        // TODO: resolve environments
        const envs = ["env-a", "env-b"];
        const { account, repo } = requester;

        for (const environment of envs) {
          provisionRequests.push({
            name,
            platform,
            type: "environment",
            account,
            repo,
            environment,
          });
        }
      }

      for (const repoPattern in secretDec.github.repos) {
        const repos = appRegistry.resolveProvisionerRepos(
          createNamePattern(repoPattern),
        );

        for (const fullRepo of repos) {
          const [account, repo] = fullRepo.split("/");

          for (const type of ["actions", "codespaces", "dependabot"] as const) {
            if (secretDec.github.repos[repoPattern][type]) {
              provisionRequests.push({ name, platform, type, account, repo });
            }
          }

          for (const envPattern of secretDec.github.repos[repoPattern]
            .environments) {
            // TODO: resolve environments
            const envs = ["env-a", "env-b"];

            for (const environment of envs) {
              provisionRequests.push({
                name,
                platform,
                type: "environment",
                account,
                repo,
                environment,
              });
            }
          }
        }
      }
    }

    const results: [ProvisionRequest, ProvisionAuthResult][] = [];

    for (const request of provisionRequests) {
      const result = provisionAuthorizer.authorizeSecret(
        `${requester.account}/${requester.repo}`,
        request,
      );
      results.push([request, result]);
    }

    console.log(JSON.stringify(results, null, 2));
  }
}
/* v8 ignore stop */
