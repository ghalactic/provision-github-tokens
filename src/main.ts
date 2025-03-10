/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, setFailed } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { readAppsInput } from "./config/apps-input.js";
import { discoverApps } from "./discover-apps.js";
import { discoverRequesters } from "./discover-requesters.js";
import { errorStack } from "./error.js";
import { createOctokitFactory } from "./octokit.js";
import { registerTokenDeclarations } from "./register-token-declarations.js";
import { createTokenDeclarationRegistry } from "./token-declaration-registry.js";

main().catch((error) => {
  setFailed(errorStack(error));
});

async function main(): Promise<void> {
  const appsInput = readAppsInput();

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  const declarationRegistry = createTokenDeclarationRegistry();

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
}
/* v8 ignore stop */
