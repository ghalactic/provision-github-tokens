import { expect, it } from "vitest";
import { prefixLines } from "./text.js";

it("prefixes each line in a multi-line string", () => {
  expect(prefixLines("> ", "a\nb\nc")).toBe("> a\n> b\n> c");
});

it("prefixes an empty input string once", () => {
  expect(prefixLines("- ", "")).toBe("- ");
});

it("prefixes empty lines as well", () => {
  expect(prefixLines("* ", "a\n\nb")).toBe("* a\n* \n* b");
});
