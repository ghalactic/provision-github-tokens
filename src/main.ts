import { info, setFailed } from "@actions/core";
import { errorStack } from "./error.js";

main().catch((error) => {
  setFailed(errorStack(error) ?? "unknown cause");
});

async function main(): Promise<void> {
  info("It's working");
}
