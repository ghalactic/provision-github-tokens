import { expect, it } from "vitest";
import { createGitHubPattern } from "../../../../src/github-pattern.js";

it("doesn't allow empty patterns", () => {
  expect(() => createGitHubPattern("")).toThrow(
    'GitHub pattern "" account part cannot be empty',
  );
});

it("doesn't allow patterns with an empty account", () => {
  expect(() => createGitHubPattern("/repo")).toThrow(
    'GitHub pattern "/repo" account part cannot be empty',
  );
});

it("doesn't allow patterns with an empty repo", () => {
  expect(() => createGitHubPattern("account/")).toThrow(
    'GitHub pattern "account/" repo part cannot be empty',
  );
});

it("doesn't allow patterns with more than one slash", () => {
  expect(() => createGitHubPattern("account/repo/extra")).toThrow(
    'GitHub pattern "account/repo/extra" cannot have more than one slash',
  );
});

it("can be converted to a string", () => {
  expect(String(createGitHubPattern("a*b/c*d"))).toBe("a*b/c*d");
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
      expect(createGitHubPattern(pattern).test(match)).toBe(true);
    });

    it(`matches ${match}/repo to ${pattern}/repo`, () => {
      expect(createGitHubPattern(`${pattern}/repo`).test(`${match}/repo`)).toBe(
        true,
      );
    });

    it(`matches account/${match} to account/${pattern}`, () => {
      expect(
        createGitHubPattern(`account/${pattern}`).test(`account/${match}`),
      ).toBe(true);
    });

    it(`matches ${match}/${match} to ${pattern}/${pattern}`, () => {
      expect(
        createGitHubPattern(`${pattern}/${pattern}`).test(`${match}/${match}`),
      ).toBe(true);
    });
  }

  for (const nonMatch of nonMatches) {
    it(`doesn't match ${nonMatch} to ${pattern}`, () => {
      expect(createGitHubPattern(pattern).test(nonMatch)).toBe(false);
    });

    it(`doesn't match ${nonMatch}/repo to ${pattern}`, () => {
      expect(createGitHubPattern(pattern).test(`${nonMatch}/repo`)).toBe(false);
    });

    it(`doesn't match ${nonMatch} to ${pattern}/repo`, () => {
      expect(createGitHubPattern(`${pattern}/repo`).test(nonMatch)).toBe(false);
    });

    it(`doesn't match ${nonMatch}/repo to ${pattern}/repo`, () => {
      expect(
        createGitHubPattern(`${pattern}/repo`).test(`${nonMatch}/repo`),
      ).toBe(false);
    });

    it(`doesn't match account/${nonMatch} to ${pattern}`, () => {
      expect(createGitHubPattern(pattern).test(`account/${nonMatch}`)).toBe(
        false,
      );
    });

    it(`doesn't match ${nonMatch} to account/${pattern}`, () => {
      expect(createGitHubPattern(`account/${pattern}`).test(nonMatch)).toBe(
        false,
      );
    });

    it(`doesn't match account/${nonMatch} to account/${pattern}`, () => {
      expect(
        createGitHubPattern(`account/${pattern}`).test(`account/${nonMatch}`),
      ).toBe(false);
    });

    it(`doesn't match ${nonMatch}/${nonMatch} to ${pattern}/${pattern}`, () => {
      expect(
        createGitHubPattern(`${pattern}/${pattern}`).test(
          `${nonMatch}/${nonMatch}`,
        ),
      ).toBe(false);
    });
  }
}
