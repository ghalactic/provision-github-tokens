import { expect, it } from "vitest";
import { createPattern } from "../../../src/pattern.js";

it("doesn't allow empty patterns", () => {
  expect(() => createPattern("")).toThrow("Pattern cannot be empty");
});

it("can be converted to a string", () => {
  expect(String(createPattern("a*b/c*d"))).toBe("a*b/c*d");
});

it.each([["*"], ["**"], ["**********"]])(
  "knows that %s matches all repos",
  (pattern) => {
    expect(createPattern(pattern).isAll).toBe(true);
  },
);

it.each([["a"], ["a*"], ["*a"], ["*a*"]])(
  "knows that %s doesn't match all repos",
  (pattern) => {
    expect(createPattern(pattern).isAll).toBe(false);
  },
);

it.each`
  pattern                 | owner
  ${"*/*"}                | ${"owner-a"}
  ${"**/**"}              | ${"owner-a"}
  ${"owner-*/*"}          | ${"owner-a"}
  ${"owner-**/**"}        | ${"owner-a"}
  ${"*-a/*"}              | ${"owner-a"}
  ${"**-a/**"}            | ${"owner-a"}
  ${"owner-a/*"}          | ${"owner-a"}
  ${"owner-a/**"}         | ${"owner-a"}
  ${"owner-a/**********"} | ${"owner-a"}
`(
  "knows that $pattern matches all repos with owner $owner",
  ({ pattern, owner }) => {
    expect(createPattern(pattern).isAllForOwner(owner)).toBe(true);
  },
);

it.each`
  pattern                 | owner
  ${"/*"}                 | ${"owner-a"}
  ${"/**"}                | ${"owner-a"}
  ${"/**********"}        | ${"owner-a"}
  ${"owner-b/*"}          | ${"owner-a"}
  ${"owner-b/**"}         | ${"owner-a"}
  ${"owner-b/**********"} | ${"owner-a"}
  ${"owner-a"}            | ${"owner-a"}
  ${"owner-a/"}           | ${"owner-a"}
  ${"owner-a/a"}          | ${"owner-a"}
  ${"owner-a/a*"}         | ${"owner-a"}
  ${"owner-a/*a"}         | ${"owner-a"}
  ${"owner-a/*a*"}        | ${"owner-a"}
`(
  "knows that $pattern doesn't match all strings with owner $owner",
  ({ pattern, owner }) => {
    expect(createPattern(pattern).isAllForOwner(owner)).toBe(false);
  },
);

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
    it(`matches ${match}/repo to ${pattern}/repo`, () => {
      expect(createPattern(`${pattern}/repo`).test(`${match}/repo`)).toBe(true);
    });

    it(`matches owner/${match} to owner/${pattern}`, () => {
      expect(createPattern(`owner/${pattern}`).test(`owner/${match}`)).toBe(
        true,
      );
    });

    it(`matches ${match}/${match} to ${pattern}/${pattern}`, () => {
      expect(
        createPattern(`${pattern}/${pattern}`).test(`${match}/${match}`),
      ).toBe(true);
    });
  }

  for (const nonMatch of nonMatches) {
    it(`doesn't match ${nonMatch}/repo to ${pattern}/repo`, () => {
      expect(createPattern(`${pattern}/repo`).test(`${nonMatch}/repo`)).toBe(
        false,
      );
    });

    it(`doesn't match owner/${nonMatch} to owner/${pattern}`, () => {
      expect(createPattern(`owner/${pattern}`).test(`owner/${nonMatch}`)).toBe(
        false,
      );
    });

    it(`doesn't match ${nonMatch}/${nonMatch} to ${pattern}/${pattern}`, () => {
      expect(
        createPattern(`${pattern}/${pattern}`).test(`${nonMatch}/${nonMatch}`),
      ).toBe(false);
    });
  }
}
