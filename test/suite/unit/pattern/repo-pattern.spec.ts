import { expect, it } from "vitest";
import { createRepoPattern } from "../../../../src/repo-pattern.js";
import { throws } from "../../../error.js";

it("doesn't allow empty patterns", () => {
  expect(throws(() => createRepoPattern(""))).toMatchInlineSnapshot(
    `"Repo pattern "" must contain exactly one slash"`,
  );
});

it("doesn't allow patterns without a slash", () => {
  expect(throws(() => createRepoPattern("a"))).toMatchInlineSnapshot(
    `"Repo pattern "a" must contain exactly one slash"`,
  );
});

it("doesn't allow patterns with an empty account", () => {
  expect(throws(() => createRepoPattern("/repo"))).toMatchInlineSnapshot(
    `"Repo pattern "/repo" account part cannot be empty"`,
  );
});

it("doesn't allow patterns with an empty repo", () => {
  expect(throws(() => createRepoPattern("account/"))).toMatchInlineSnapshot(
    `"Repo pattern "account/" repo part cannot be empty"`,
  );
});

it("can be converted to a string", () => {
  expect(String(createRepoPattern("a*b/c*d"))).toBe("a*b/c*d");
});

it.each([["*/*"], ["**/**"], ["**********/**********"]])(
  "knows that %s matches all repos",
  (pattern) => {
    expect(createRepoPattern(pattern).isAll).toBe(true);
  },
);

it.each([
  ["a/*"],
  ["a*/*"],
  ["*a/*"],
  ["*a*/*"],
  ["*/a"],
  ["*/a*"],
  ["*/*a"],
  ["*/*a*"],
  ["a/a"],
  ["a*/a*"],
  ["*a/*a"],
  ["*a*/*a*"],
])("knows that %s doesn't match all repos", (pattern) => {
  expect(createRepoPattern(pattern).isAll).toBe(false);
});

it.each`
  pattern                   | account
  ${"*/*"}                  | ${"account-a"}
  ${"**/**"}                | ${"account-a"}
  ${"account-*/*"}          | ${"account-a"}
  ${"account-**/**"}        | ${"account-a"}
  ${"*-a/*"}                | ${"account-a"}
  ${"**-a/**"}              | ${"account-a"}
  ${"account-a/*"}          | ${"account-a"}
  ${"account-a/**"}         | ${"account-a"}
  ${"account-a/**********"} | ${"account-a"}
`(
  "knows that $pattern matches all repos with account $account",
  ({ pattern, account }) => {
    const actual = createRepoPattern(pattern);

    expect(actual.account.test(account) && actual.repo.isAll).toBe(true);
  },
);

it.each`
  pattern                   | account
  ${"account-b/*"}          | ${"account-a"}
  ${"account-b/**"}         | ${"account-a"}
  ${"account-b/**********"} | ${"account-a"}
  ${"account-a/a"}          | ${"account-a"}
  ${"account-a/a*"}         | ${"account-a"}
  ${"account-a/*a"}         | ${"account-a"}
  ${"account-a/*a*"}        | ${"account-a"}
`(
  "knows that $pattern doesn't match all strings with account $account",
  ({ pattern, account }) => {
    const actual = createRepoPattern(pattern);

    expect(actual.account.test(account) && actual.repo.isAll).toBe(false);
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
      expect(createRepoPattern(`${pattern}/repo`).test(`${match}/repo`)).toBe(
        true,
      );
    });

    it(`matches account/${match} to account/${pattern}`, () => {
      expect(
        createRepoPattern(`account/${pattern}`).test(`account/${match}`),
      ).toBe(true);
    });

    it(`matches ${match}/${match} to ${pattern}/${pattern}`, () => {
      expect(
        createRepoPattern(`${pattern}/${pattern}`).test(`${match}/${match}`),
      ).toBe(true);
    });
  }

  for (const nonMatch of nonMatches) {
    it(`doesn't match ${nonMatch}/repo to ${pattern}/repo`, () => {
      expect(
        createRepoPattern(`${pattern}/repo`).test(`${nonMatch}/repo`),
      ).toBe(false);
    });

    it(`doesn't match account/${nonMatch} to account/${pattern}`, () => {
      expect(
        createRepoPattern(`account/${pattern}`).test(`account/${nonMatch}`),
      ).toBe(false);
    });

    it(`doesn't match ${nonMatch}/${nonMatch} to ${pattern}/${pattern}`, () => {
      expect(
        createRepoPattern(`${pattern}/${pattern}`).test(
          `${nonMatch}/${nonMatch}`,
        ),
      ).toBe(false);
    });
  }
}
