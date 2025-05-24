/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, info, setFailed, warning } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { readAppsInput } from "./config/apps-input.js";
import { discoverApps } from "./discover-apps.js";
import { discoverRequesters } from "./discover-requesters.js";
import { createEnvironmentResolver } from "./environment-resolver.js";
import { errorStack } from "./error.js";
import { repoRefToString } from "./github-reference.js";
import { createOctokitFactory } from "./octokit.js";
import { createTextProvisionAuthExplainer } from "./provision-auth-explainer/text.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";
import { createProvisionRequestFactory } from "./provision-request.js";
import { registerTokenDeclarations } from "./register-token-declarations.js";
import { createTextTokenAuthExplainer } from "./token-auth-explainer/text.js";
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
  const createTokenRequests = createTokenRequestFactory(appRegistry);
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
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

  // TODO: generate provision requests
  // TODO: authorize provisioning
  // TODO: output auth results
  // TODO: issue tokens
  // TODO: provision secrets

  for (const [, discovered] of requesters) {
    for (const name in discovered.config.provision.secrets) {
      const provisionReq = await createProvisionRequest(
        discovered.requester,
        name,
        discovered.config.provision.secrets[name],
      );

      if (!provisionReq) continue;

      // TODO: roll into provision authorizer
      if (!provisionReq.tokenDec) {
        if (provisionReq.tokenDecIsRegistered) {
          warning(
            `Token ${provisionReq.secretDec.token} ` +
              `cannot be used from ${repoRefToString(provisionReq.requester)}`,
          );
        } else {
          warning(`Undefined token ${provisionReq.secretDec.token}`);
        }
      }

      // TODO: roll into provision authorizer
      const tokenReqs = createTokenRequests(provisionReq);
      let isAllowed = true;

      for (const tokenReq of tokenReqs) {
        isAllowed &&= tokenAuthorizer.authorizeToken(tokenReq).isAllowed;
      }

      if (!isAllowed) {
        warning(
          `Secret ${provisionReq.name} can't be provisioned to all targets`,
        );

        continue;
      }

      provisionAuthorizer.authorizeSecret(provisionReq);
    }
  }

  for (const result of tokenAuthorizer.listResults()) {
    info(tokenAuthExplainer(result));
  }
  for (const result of provisionAuthorizer.listResults()) {
    info(provisionAuthExplainer(result));
  }
}
/* v8 ignore stop */
