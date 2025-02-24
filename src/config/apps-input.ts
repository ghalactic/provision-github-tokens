import { getInput } from "@actions/core";
import { load } from "js-yaml";
import type { AppInput } from "../type/input.js";
import { validateApps } from "./validation.js";

export function readAppsInput(): AppInput[] {
  const yaml = getInput("apps");
  let parsed;

  try {
    parsed = load(yaml);
  } catch (cause) {
    throw new Error("Parsing of apps action input failed", { cause });
  }

  try {
    return validateApps(parsed);
  } catch (cause) {
    throw new Error("Validation of apps action input failed", { cause });
  }
}
