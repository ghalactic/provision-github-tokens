import { getInput } from "@actions/core";
import { load } from "js-yaml";
import { errorMessage } from "../error.js";
import type { AppInput } from "../type/input.js";
import { validateApps } from "./validation.js";

export function readAppsInput(): AppInput[] {
  const yaml = getInput("apps");
  let parsed;

  try {
    parsed = load(yaml);
  } catch (error) {
    throw new Error(
      `Parsing of apps action input failed: ${errorMessage(error)}`,
    );
  }

  try {
    return validateApps(parsed);
  } catch (error) {
    throw new Error(
      `Validation of apps action input failed: ${errorMessage(error)}`,
    );
  }
}
