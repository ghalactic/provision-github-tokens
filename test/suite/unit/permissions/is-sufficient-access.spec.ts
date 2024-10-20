import { expect, it } from "vitest";
import { isSufficientAccess } from "../../../../src/access-level.js";

it.each`
  have       | want
  ${"read"}  | ${"read"}
  ${"write"} | ${"read"}
  ${"write"} | ${"write"}
  ${"admin"} | ${"read"}
  ${"admin"} | ${"write"}
  ${"admin"} | ${"admin"}
`("knows that $have is sufficient for $want", ({ have, want }) => {
  expect(isSufficientAccess(have, want)).toBe(true);
});

it.each`
  have       | want
  ${"read"}  | ${"write"}
  ${"read"}  | ${"admin"}
  ${"write"} | ${"admin"}
`("knows that $have is not sufficient for $want", ({ have, want }) => {
  expect(isSufficientAccess(have, want)).toBe(false);
});
