import { debug, getInput } from "@actions/core";
import { load } from "js-yaml";
import { errorMessage } from "../error.js";
import type { AppInput, RawAppInput } from "../type/input.js";
import { validateApps } from "./validation.js";

export function readAppsInput(): AppInput[] {
  const yaml = getInput("apps");

  try {
    const parsed = load(yaml);

    return normalizeAppsInput(validateApps(parsed));
  } catch (cause) {
    debug(`Parsing of apps action input failed: ${errorMessage(cause)}`);
    throw new Error("Parsing of apps action input failed", { cause });
  }
}

function normalizeAppsInput(apps: RawAppInput[]): AppInput[] {
  const normalized: AppInput[] = [];

  for (const app of apps) {
    normalized.push({
      ...app,
      appId:
        typeof app.appId === "number" ? app.appId : parseInt(app.appId, 10),
    });
  }

  return normalized;
}
