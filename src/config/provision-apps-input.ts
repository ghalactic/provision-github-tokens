import { getInput } from "@actions/core";
import { load } from "js-yaml";
import type { AppsInputApp } from "../type/input.js";
import { validateProvisionApps } from "./validation.js";

export function readProvisionAppsInput(): AppsInputApp[] {
  const yaml = getInput("provisionApps");
  let parsed;

  try {
    parsed = load(yaml);
  } catch (cause) {
    throw new Error("Parsing of provisionApps action input failed", { cause });
  }

  try {
    return validateProvisionApps(parsed);
  } catch (cause) {
    throw new Error("Validation of provisionApps action input failed", {
      cause,
    });
  }
}
