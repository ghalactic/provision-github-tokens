import { vi } from "vitest";
import { errorMessage } from "../../src/error.js";

let output = "";

export function __reset() {
  output = "";
}

export function __getOutput() {
  return output;
}

export const getInput = vi.fn(() => "");
export const debug = vi.fn((message) => {
  addLines("::debug::", message);
});
export const error = vi.fn((errorOrMessage) => {
  addLines("::error::", errorMessage(errorOrMessage));
});
export const info = vi.fn((message) => {
  addLines("", message);
});

function addLines(prefix: string, lines: string): void {
  for (const line of lines.split("\n")) output += `${prefix}${line}\n`;
}
