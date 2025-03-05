/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, setFailed, warning } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { readAppsInput } from "./config/apps-input.js";
import { discoverApps } from "./discover-apps.js";
import { discoverConsumers } from "./discover-consumers.js";
import { createEnvironmentResolver } from "./environment-resolver.js";
import { errorStack } from "./error.js";
import { createNamePattern } from "./name-pattern.js";
import { createOctokitFactory } from "./octokit.js";
import { createTextProvisionAuthExplainer } from "./provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";
import { registerTokenDeclarations } from "./register-token-declarations.js";
import { createTextTokenAuthExplainer } from "./token-auth-explainer/text.js";
import { createTokenAuthorizer } from "./token-authorizer.js";
import { createTokenDeclarationRegistry } from "./token-declaration-registry.js";
import type { ProviderConfig } from "./type/provider-config.js";
import type { ProvisionAuthResult } from "./type/provision-auth-result.js";
import type { ProvisionRequest } from "./type/provision-request.js";
import type { SecretDeclaration } from "./type/secret-declaration.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenRequest } from "./type/token-request.js";

main().catch((error) => {
  setFailed(errorStack(error));
});

async function main(): Promise<void> {
  const appsInput = readAppsInput();

  const config = await group("Reading provider configuration", async () => {
    // TODO: read from file
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
  const provisionAuthorizer = createProvisionAuthorizer(config.provision);
  const tokenAuthorizer = createTokenAuthorizer(config.permissions);

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

  const provisionRequests: [SecretDeclaration, ProvisionRequest][] = [];
  const platform = "github";

  for (const [, requester] of consumers) {
    for (const name in requester.config.provision.secrets) {
      const secretDec = requester.config.provision.secrets[name];

      for (const type of ["actions", "codespaces", "dependabot"] as const) {
        if (secretDec.github.account[type]) {
          provisionRequests.push([
            secretDec,
            {
              requester,
              name,
              platform,
              account: requester.account,
              type,
            },
          ]);
        }
      }

      for (const accountPattern in secretDec.github.accounts) {
        const accounts = appRegistry.resolveProvisionerAccounts([
          createNamePattern(accountPattern),
        ]);

        for (const type of ["actions", "codespaces", "dependabot"] as const) {
          if (secretDec.github.accounts[accountPattern][type]) {
            for (const account of accounts) {
              provisionRequests.push([
                secretDec,
                {
                  requester,
                  name,
                  platform,
                  type,
                  account,
                },
              ]);
            }
          }
        }
      }

      for (const type of ["actions", "codespaces", "dependabot"] as const) {
        if (secretDec.github.repo[type]) {
          provisionRequests.push([
            secretDec,
            {
              requester,
              name,
              platform,
              type,
              account: requester.account,
              repo: requester.repo,
            },
          ]);
        }
      }

      if (secretDec.github.repo.environments.length > 0) {
        const { account, repo } = requester;
        const envs = await environmentResolver.resolveEnvironments(
          `${account}/${repo}`,
          secretDec.github.repo.environments.map(createNamePattern),
        );

        for (const environment of envs) {
          provisionRequests.push([
            secretDec,
            {
              requester,
              name,
              platform,
              type: "environment",
              account,
              repo,
              environment,
            },
          ]);
        }
      }

      for (const repoPattern in secretDec.github.repos) {
        const repos = appRegistry.resolveProvisionerRepos([
          createNamePattern(repoPattern),
        ]);

        for (const fullRepo of repos) {
          const [account, repo] = fullRepo.split("/");

          for (const type of ["actions", "codespaces", "dependabot"] as const) {
            if (secretDec.github.repos[repoPattern][type]) {
              provisionRequests.push([
                secretDec,
                {
                  requester,
                  name,
                  platform,
                  type,
                  account,
                  repo,
                },
              ]);
            }
          }

          if (secretDec.github.repos[repoPattern].environments.length > 0) {
            const envs = await environmentResolver.resolveEnvironments(
              fullRepo,
              secretDec.github.repos[repoPattern].environments.map(
                createNamePattern,
              ),
            );

            for (const environment of envs) {
              provisionRequests.push([
                secretDec,
                {
                  requester,
                  name,
                  platform,
                  type: "environment",
                  account,
                  repo,
                  environment,
                },
              ]);
            }
          }
        }
      }
    }
  }

  const provisionAuthExplainer = createTextProvisionAuthExplainer();
  const provisionAuthResults: [ProvisionRequest, ProvisionAuthResult][] = [];
  const tokenRequests: Record<
    string,
    [account: string, repo: string | undefined, TokenRequest]
  > = {};

  for (const [secretDec, provisionReq] of provisionRequests) {
    const provisionResult = provisionAuthorizer.authorizeSecret(provisionReq);
    provisionAuthResults.push([provisionReq, provisionResult]);
    console.log(provisionAuthExplainer(provisionResult));

    if (!provisionResult.isAllowed) continue;

    const [tokenDec] = declarationRegistry.findDeclarationForRequester(
      provisionReq.requester.account,
      provisionReq.requester.repo,
      secretDec.token,
    );

    if (!tokenDec) {
      warning(`Undefined token ${secretDec.token}`);

      continue;
    }

    const key = JSON.stringify([
      provisionReq.account,
      provisionReq.repo,
      secretDec.token,
    ]);

    if (tokenRequests[key]) continue;

    tokenRequests[key] = [
      provisionReq.account,
      provisionReq.repo,
      {
        role: tokenDec.as,
        account: tokenDec.account,
        repos:
          tokenDec.repos === "all"
            ? "all"
            : appRegistry.resolveIssuerRepos(
                tokenDec.repos.map(createNamePattern),
              ),
        permissions: tokenDec.permissions,
      },
    ];
  }

  const tokenAuthExplainer = createTextTokenAuthExplainer();
  const tokenAuthResults: [TokenRequest, TokenAuthResult][] = [];

  for (const [key, [account, repo, request]] of Object.entries(tokenRequests)) {
    const result =
      repo == null
        ? tokenAuthorizer.authorizeForAccount(account, request)
        : tokenAuthorizer.authorizeForRepo(`${account}/${repo}`, request);
    tokenAuthResults.push([request, result]);
    console.log(tokenAuthExplainer(result));
  }
}
/* v8 ignore stop */
