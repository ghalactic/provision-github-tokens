/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, setFailed } from "@actions/core";
import { readTokenAppsInput } from "./config/token-apps-input.js";
import { discoverTokenApps } from "./discover-token-apps.js";
import { createOctokitFactory } from "./octokit.js";
import { createTokenAppRegistry } from "./token-app-registry.js";

main().catch((error) => {
  setFailed(error instanceof Error ? error : String(error));
});

async function main(): Promise<void> {
  const octokitFactory = createOctokitFactory();
  const registry = createTokenAppRegistry();

  await group("Discovering provision apps", async () => {
    await discoverTokenApps(octokitFactory, registry, readTokenAppsInput());
  });
}
/* v8 ignore stop */
