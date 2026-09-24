import { expect, it } from "vitest";
import { errorCause } from "./error.js";

it("returns the error cause when available", () => {
  const cause = new Error("foo");
  const error = new Error("bar", { cause });

  expect(errorCause(error)).toBe(cause);
});

it("returns undefined when there is no error cause", () => {
  const error = new Error("bar");

  expect(errorCause(error)).toBeUndefined();
});
