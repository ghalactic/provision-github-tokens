import { info, setFailed } from "@actions/core";
import { readAppsInput } from "./config/apps-input.js";
import { errorStack } from "./error.js";

main().catch((error) => {
  setFailed(errorStack(error) ?? "unknown cause");
});

async function main(): Promise<void> {
  info("It's working");

  for (const { appId, roles } of readAppsInput()) {
    info(`Found app ${appId} with roles ${roles.join(", ")}`);
  }
}
