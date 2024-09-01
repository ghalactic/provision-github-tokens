import "source-map-support/register";

import { group, setFailed } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { readAppsInput } from "./config/apps-input.js";
import { discoverApps } from "./discover-apps.js";
import { errorStack } from "./error.js";

main().catch((error) => {
  setFailed(errorStack(error) ?? "unknown cause");
});

async function main(): Promise<void> {
  const registry = createAppRegistry();

  await group("Discovering apps", async () => {
    await discoverApps(registry, readAppsInput());
  });
}
