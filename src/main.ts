/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, setFailed } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { readAppsInput } from "./config/apps-input.js";
import { discoverApps } from "./discover-apps.js";
import { errorStack } from "./error.js";
import { createOctokitFactory } from "./octokit.js";

main().catch((error) => {
  setFailed(errorStack(error) ?? "unknown cause");
});

async function main(): Promise<void> {
  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();

  await group("Discovering apps", async () => {
    await discoverApps(octokitFactory, registry, readAppsInput());
  });
}
/* v8 ignore end */
