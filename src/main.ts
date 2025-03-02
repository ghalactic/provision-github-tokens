/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, info, setFailed, warning } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { readAppsInput } from "./config/apps-input.js";
import { discoverApps } from "./discover-apps.js";
import { discoverRequesters } from "./discover-requesters.js";
import { createEnvironmentResolver } from "./environment-resolver.js";
import { errorStack } from "./error.js";
import { createGitHubPattern } from "./github-pattern.js";
import {
  accountOrRepoRefToString,
  createEnvRef,
  createRepoRef,
  repoRefFromName,
  repoRefToString,
} from "./github-reference.js";
import { createNamePattern } from "./name-pattern.js";
import { createOctokitFactory } from "./octokit.js";
import { createTextProvisionAuthExplainer } from "./provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";
import { registerTokenDeclarations } from "./register-token-declarations.js";
import { createTextTokenAuthExplainer } from "./token-auth-explainer/text.js";
import { createTokenAuthorizer } from "./token-authorizer.js";
import { createTokenDeclarationRegistry } from "./token-declaration-registry.js";
import type { ProviderConfig } from "./type/provider-config.js";
import type { ProvisionRequest } from "./type/provision-request.js";
import type { SecretDeclaration } from "./type/secret-declaration.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenDeclaration } from "./type/token-declaration.js";
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
  const tokenAuthorizer = createTokenAuthorizer(config.permissions);
  const tokenAuthExplainer = createTextTokenAuthExplainer();
  const provisionAuthorizer = createProvisionAuthorizer(config.provision);
  const provisionAuthExplainer = createTextProvisionAuthExplainer();

  await group("Discovering apps", async () => {
    await discoverApps(octokitFactory, appRegistry, appsInput);
  });

  const requesters = await group("Discovering requesters", async () => {
    return discoverRequesters(octokitFactory, appRegistry, appsInput);
  });

  registerTokenDeclarations(declarationRegistry, requesters);

  // TODO: generate token requests
  // TODO: generate provision requests
  // TODO: authorize tokens
  // TODO: authorize provisioning
  // TODO: issue tokens
  // TODO: provision secrets

  const requests: [SecretDeclaration, TokenDeclaration, ProvisionRequest][] =
    [];
  const platform = "github";

  for (const [, discovered] of requesters) {
    for (const name in discovered.config.provision.secrets) {
      const secretDec = discovered.config.provision.secrets[name];

      const [tokenDec] = declarationRegistry.findDeclarationForRequester(
        discovered.requester,
        secretDec.token,
      );

      if (!tokenDec) {
        warning(`Undefined token ${secretDec.token}`);

        continue;
      }

      for (const type of ["actions", "codespaces", "dependabot"] as const) {
        if (secretDec.github.account[type]) {
          requests.push([
            secretDec,
            tokenDec,
            {
              requester: discovered.requester,
              name,
              platform,
              target: { account: discovered.requester.account },
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
              requests.push([
                secretDec,
                tokenDec,
                {
                  requester: discovered.requester,
                  name,
                  platform,
                  type,
                  target: { account },
                },
              ]);
            }
          }
        }
      }

      for (const type of ["actions", "codespaces", "dependabot"] as const) {
        if (secretDec.github.repo[type]) {
          requests.push([
            secretDec,
            tokenDec,
            {
              requester: discovered.requester,
              name,
              platform,
              type,
              target: discovered.requester,
            },
          ]);
        }
      }

      if (secretDec.github.repo.environments.length > 0) {
        const envs = await environmentResolver.resolveEnvironments(
          discovered.requester,
          secretDec.github.repo.environments.map(createNamePattern),
        );

        for (const environment of envs) {
          requests.push([
            secretDec,
            tokenDec,
            {
              requester: discovered.requester,
              name,
              platform,
              type: "environment",
              target: { ...discovered.requester, environment },
            },
          ]);
        }
      }

      for (const repoPattern in secretDec.github.repos) {
        const repos = appRegistry.resolveProvisionerRepos([
          createNamePattern(repoPattern),
        ]);

        for (const repoName of repos) {
          const repo = repoRefFromName(repoName);

          for (const type of ["actions", "codespaces", "dependabot"] as const) {
            if (secretDec.github.repos[repoPattern][type]) {
              requests.push([
                secretDec,
                tokenDec,
                {
                  requester: discovered.requester,
                  name,
                  platform,
                  type,
                  target: repo,
                },
              ]);
            }
          }

          if (secretDec.github.repos[repoPattern].environments.length > 0) {
            const envs = await environmentResolver.resolveEnvironments(
              repo,
              secretDec.github.repos[repoPattern].environments.map(
                createNamePattern,
              ),
            );

            for (const environment of envs) {
              requests.push([
                secretDec,
                tokenDec,
                {
                  requester: discovered.requester,
                  name,
                  platform,
                  type: "environment",
                  target: createEnvRef(repo.account, repo.repo, environment),
                },
              ]);
            }
          }
        }
      }
    }
  }

  const tokenAuthResults: Record<string, TokenAuthResult> = {};

  for (const [secretDec, tokenDec, provisionReq] of requests) {
    const tokenAuthKey = JSON.stringify([
      accountOrRepoRefToString(provisionReq.target),
      secretDec.token,
    ]);

    let tokenAuthResult = tokenAuthResults[tokenAuthKey];

    if (tokenAuthResult == null) {
      let repos: "all" | string[];

      if (tokenDec.repos === "all") {
        repos = "all";
      } else {
        const repoPatterns = tokenDec.repos.map((repo) => {
          return createGitHubPattern(
            repoRefToString(createRepoRef(tokenDec.account, repo)),
          );
        });

        repos = appRegistry
          .resolveIssuerRepos(repoPatterns)
          .map((repo) => repoRefFromName(repo).repo);
      }

      const tokenReq: TokenRequest = {
        consumer: provisionReq.target,
        declaration: tokenDec,
        repos,
      };

      tokenAuthResult = tokenAuthorizer.authorizeToken(tokenReq);
      tokenAuthResults[tokenAuthKey] = tokenAuthResult;
      info(tokenAuthExplainer(tokenAuthResult));
    }

    if (!tokenAuthResult.isAllowed) continue;

    const provisionResult = provisionAuthorizer.authorizeSecret(provisionReq);
    info(provisionAuthExplainer(provisionResult));
  }
}
/* v8 ignore stop */
