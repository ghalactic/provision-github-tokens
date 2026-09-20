import { expect, it } from "vitest";
import { createSequencer } from "./sequencer.js";

it("assigns one-based numbers in first-seen order", () => {
  const seq = createSequencer<object>();
  const a = {};
  const b = {};
  const c = {};

  expect(seq(a)).toBe(1);
  expect(seq(b)).toBe(2);
  expect(seq(a)).toBe(1);
  expect(seq(c)).toBe(3);
});
