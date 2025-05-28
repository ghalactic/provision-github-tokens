/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, setFailed } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { createAuthorizer } from "./authorizer.js";
import { readAppsInput } from "./config/apps-input.js";
import { readProviderConfig } from "./config/provider-config.js";
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

main().catch((error) => {
  setFailed(errorStack(error));
});

async function main(): Promise<void> {
  const appsInput = readAppsInput();
  const octokitFactory = createOctokitFactory();

  const config = await group("Reading config", async () => {
    return await readProviderConfig(
      octokitFactory,
      process.env.GITHUB_REPOSITORY ?? "",
      process.env.GITHUB_REF ?? "",
    );
  });

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
