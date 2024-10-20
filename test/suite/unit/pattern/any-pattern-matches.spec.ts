import { expect, it } from "vitest";
import { anyPatternMatches } from "../../../../src/pattern.js";
import { createRepoPattern } from "../../../../src/repo-pattern.js";

it("returns false when no patterns are provided", () => {
  expect(anyPatternMatches([], "a")).toBe(false);
});

it("returns false when no patterns match", () => {
  const patterns = [createRepoPattern("a/*"), createRepoPattern("b/*")];

  expect(anyPatternMatches(patterns, "c/xxx")).toBe(false);
});

it("returns true when any pattern matches", () => {
  const patterns = [
    createRepoPattern("a/*"),
    createRepoPattern("b/*"),
    createRepoPattern("c/*"),
  ];

  expect(anyPatternMatches(patterns, "a/xxx")).toBe(true);
  expect(anyPatternMatches(patterns, "b/xxx")).toBe(true);
  expect(anyPatternMatches(patterns, "c/xxx")).toBe(true);
});
