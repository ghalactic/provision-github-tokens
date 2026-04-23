import { expect, it } from "vitest";
import { createNamePattern } from "../../../../src/name-pattern.js";
import { throws } from "../../../error.js";

it("doesn't allow empty patterns", () => {
  expect(throws(() => createNamePattern(""))).toMatchInlineSnapshot(
    `"Pattern cannot be empty"`,
  );
});

it("doesn't allow patterns with slashes", () => {
  expect(throws(() => createNamePattern("/"))).toMatchInlineSnapshot(
    `"Pattern "/" cannot contain /"`,
  );
});

it("can be converted to a string", () => {
  expect(String(createNamePattern("a*b"))).toBe("a*b");
});

const patterns: [pattern: string, matches: string[], nonMatches: string[]][] = [
  ["name-a", ["name-a"], ["name-b"]],
  ["name.a", ["name.a"], ["name-b"]],
  ["name-*", ["name-a", "name-abc"], ["name-x/x"]],
  ["*-name", ["a-name", "abc-name"], ["x/x-name"]],
  ["name-*-name", ["name-a-name", "name-abc-name"], ["name-x/x-name"]],
  ["*-name-*", ["a-name-a", "abc-name-abc"], ["x/x-name-a", "a-name-x/x"]],
  ["*", ["a", "abc"], ["x/x"]],
  ["**", ["a", "abc"], ["x/x"]],
];

for (const [pattern, matches, nonMatches] of patterns) {
  for (const match of matches) {
    it(`matches ${match} to ${pattern}`, () => {
      expect(createNamePattern(pattern).test(match)).toBe(true);
    });
  }

  for (const nonMatch of nonMatches) {
    it(`doesn't match ${nonMatch} to ${pattern}`, () => {
      expect(createNamePattern(pattern).test(nonMatch)).toBe(false);
    });
  }
}

it("is literal when the pattern has no wildcards", () => {
  expect(createNamePattern("contents").isLiteral).toBe(true);
});

it("is literal when the pattern has no wildcards and contains dots", () => {
  expect(createNamePattern("name.a").isLiteral).toBe(true);
});

it("is not literal when the pattern contains a wildcard", () => {
  expect(createNamePattern("secret_*").isLiteral).toBe(false);
});

it("is not literal when the pattern is a lone wildcard", () => {
  expect(createNamePattern("*").isLiteral).toBe(false);
});

it("is not literal when the pattern contains multiple wildcards", () => {
  expect(createNamePattern("*-name-*").isLiteral).toBe(false);
});
