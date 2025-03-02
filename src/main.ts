/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, setFailed } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { readAppsInput } from "./config/apps-input.js";
import { discoverApps } from "./discover-apps.js";
import { discoverConsumers } from "./discover-consumers.js";
import { createOctokitFactory } from "./octokit.js";

main().catch((error) => {
  setFailed(error instanceof Error ? error : String(error));
});

async function main(): Promise<void> {
  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  const appsInput = readAppsInput();

  await group("Discovering apps", async () => {
    await discoverApps(octokitFactory, appRegistry, appsInput);
  });

  const discovered = await group("Discovering consumers", async () => {
    return discoverConsumers(octokitFactory, appRegistry, appsInput);
  });

  // TODO: register token declarations
  // TODO: generate token requests
  // TODO: generate provision requests
  // TODO: authorize tokens
  // TODO: authorize provisioning
  // TODO: issue tokens
  // TODO: provision secrets
}
/* v8 ignore stop */
