import { expect, it } from "vitest";
import { createGitHubPattern } from "../../../../src/github-pattern.js";
import { anyPatternMatches } from "../../../../src/pattern.js";

it("returns false when no patterns are provided", () => {
  expect(anyPatternMatches([], "a")).toBe(false);
});

it("returns false when no patterns match", () => {
  const patterns = [createGitHubPattern("a/*"), createGitHubPattern("b/*")];

  expect(anyPatternMatches(patterns, "c/xxx")).toBe(false);
});

it("returns true when any pattern matches", () => {
  const patterns = [
    createGitHubPattern("a/*"),
    createGitHubPattern("b/*"),
    createGitHubPattern("c/*"),
  ];

  expect(anyPatternMatches(patterns, "a/xxx")).toBe(true);
  expect(anyPatternMatches(patterns, "b/xxx")).toBe(true);
  expect(anyPatternMatches(patterns, "c/xxx")).toBe(true);
});
