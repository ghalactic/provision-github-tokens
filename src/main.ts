/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, setFailed } from "@actions/core";
import { readProvisionAppsInput } from "./config/provision-apps-input.js";
import { discoverProvisionApps } from "./discover-provision-apps.js";
import { createOctokitFactory } from "./octokit.js";
import { createProvisionAppRegistry } from "./provision-app-registry.js";

main().catch((error) => {
  setFailed(error instanceof Error ? error : String(error));
});

async function main(): Promise<void> {
  const octokitFactory = createOctokitFactory();
  const registry = createProvisionAppRegistry();

  await group("Discovering provision apps", async () => {
    await discoverProvisionApps(
      octokitFactory,
      registry,
      readProvisionAppsInput(),
    );
  });
}
/* v8 ignore stop */
