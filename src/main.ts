import { info, setFailed } from "@actions/core";
import { isError } from "./guard.js";

main().catch((error) => {
  const stack = isError(error) ? error.stack : undefined;
  setFailed(stack ?? "unknown cause");
});

async function main(): Promise<void> {
  info("It's working");
}
