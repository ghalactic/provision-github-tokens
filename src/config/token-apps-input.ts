import { getInput } from "@actions/core";
import { load } from "js-yaml";
import type { AppsInputApp } from "../type/input.js";
import { validateTokenApps } from "./validation.js";

export function readTokenAppsInput(): AppsInputApp[] {
  const yaml = getInput("tokenApps");
  let parsed;

  try {
    parsed = load(yaml);
  } catch (cause) {
    throw new Error("Parsing of tokenApps action input failed", { cause });
  }

  try {
    return validateTokenApps(parsed);
  } catch (cause) {
    throw new Error("Validation of tokenApps action input failed", {
      cause,
    });
  }
}
