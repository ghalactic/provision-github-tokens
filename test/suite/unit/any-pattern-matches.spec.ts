import { expect, it } from "vitest";
import { anyPatternMatches, createPattern } from "../../../src/pattern.js";

it("returns false when no patterns are provided", () => {
  expect(anyPatternMatches([], "a")).toBe(false);
});

it("returns false when no patterns match", () => {
  const patterns = [createPattern("a/*"), createPattern("b/*")];

  expect(anyPatternMatches(patterns, "c/xxx")).toBe(false);
});

it("returns true when any pattern matches", () => {
  const patterns = [
    createPattern("a/*"),
    createPattern("b/*"),
    createPattern("c/*"),
  ];

  expect(anyPatternMatches(patterns, "a/xxx")).toBe(true);
  expect(anyPatternMatches(patterns, "b/xxx")).toBe(true);
  expect(anyPatternMatches(patterns, "c/xxx")).toBe(true);
});
