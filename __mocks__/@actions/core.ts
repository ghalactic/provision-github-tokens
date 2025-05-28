import { vi } from "vitest";
import { errorMessage } from "../../src/error.js";

let inputs: Record<string, string> = {};
let output = "";

export function __reset() {
  inputs = {};
  output = "";
}

export function __setInputs(nextInputs: Record<string, string>) {
  inputs = nextInputs;
}

export function __getOutput() {
  return output;
}

export function getInput(name: string) {
  return inputs[name] ?? "";
}

export const debug = vi.fn((message) => {
  addLines("::debug::", message);
});
export const error = vi.fn((errorOrMessage) => {
  addLines("::error::", errorMessage(errorOrMessage));
});
export const info = vi.fn((message) => {
  addLines("", message);
});
export const warning = vi.fn((message) => {
  addLines("::warning::", message);
});

function addLines(prefix: string, lines: string): void {
  for (const line of lines.split("\n")) output += `${prefix}${line}\n`;
}
