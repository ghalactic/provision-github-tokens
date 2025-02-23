/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, setFailed } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { readProvisionAppsInput } from "./config/provision-apps-input.js";
import { readTokenAppsInput } from "./config/token-apps-input.js";
import { discoverApps } from "./discover-apps.js";
import { createOctokitFactory } from "./octokit.js";
import { createTokenAppRegistry } from "./token-app-registry.js";

main().catch((error) => {
  setFailed(error instanceof Error ? error : String(error));
});

async function main(): Promise<void> {
  const octokitFactory = createOctokitFactory();
  const provisionAppRegistry = createAppRegistry();
  const tokenAppRegistry = createTokenAppRegistry();

  await group("Discovering provision apps", async () => {
    await discoverApps(
      octokitFactory,
      provisionAppRegistry,
      readProvisionAppsInput(),
    );
  });

  await group("Discovering token apps", async () => {
    await discoverApps(octokitFactory, tokenAppRegistry, readTokenAppsInput());
  });
}
/* v8 ignore stop */
