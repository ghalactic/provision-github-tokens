import { expect, it } from "vitest";
import { errorStack } from "../../../src/error.js";

it("returns the error stack when available", () => {
  const error = new Error("foo");
  error.stack = "Error: foo\n    at bar.ts:1:1";

  expect(errorStack(error)).toMatchInlineSnapshot(`
    "Error: foo
        at bar.ts:1:1"
  `);
});

it("returns the error message if there is no stack", () => {
  const error = new Error("foo");
  delete error.stack;

  expect(errorStack(error)).toBe("foo");
});

it("returns the string representation of non-error values", () => {
  expect(errorStack(111)).toBe("111");
});
