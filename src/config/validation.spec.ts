import { expect, it } from "vitest";
import { findValidationErrors, validateApps } from "./validation.js";

it("returns no validation errors for unrelated values", () => {
  expect(findValidationErrors(new Error("boom"))).toEqual([]);
  expect(findValidationErrors(null)).toEqual([]);
});

it("finds validation errors through error causes", () => {
  let validationError: unknown;

  try {
    validateApps(null);
  } catch (error) {
    validationError = error;
  }

  const errors = findValidationErrors(
    new Error("wrapped", { cause: validationError }),
  );

  expect(errors).not.toHaveLength(0);
});
