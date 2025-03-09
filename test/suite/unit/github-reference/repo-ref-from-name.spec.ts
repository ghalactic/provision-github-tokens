import { expect, it } from "vitest";
import { repoRefFromName } from "../../../../src/github-reference.js";

it("parses repo names", () => {
  expect(repoRefFromName("account-a/repo-a")).toEqual({
    account: "account-a",
    repo: "repo-a",
  });
});

it("throws for invalid repo names", () => {
  expect(() => repoRefFromName("")).toThrow('Invalid repo name ""');
  expect(() => repoRefFromName("account-a")).toThrow(
    'Invalid repo name "account-a"',
  );
  expect(() => repoRefFromName("account-a/repo-a/")).toThrow(
    'Invalid repo name "account-a/repo-a/"',
  );
  expect(() => repoRefFromName("account-a/repo-a/repo-b")).toThrow(
    'Invalid repo name "account-a/repo-a/repo-b"',
  );
  expect(() => repoRefFromName("/")).toThrow('Invalid account name ""');
  expect(() => repoRefFromName("/repo-a")).toThrow('Invalid account name ""');
  expect(() => repoRefFromName("account-a/")).toThrow('Invalid repo name ""');
});
