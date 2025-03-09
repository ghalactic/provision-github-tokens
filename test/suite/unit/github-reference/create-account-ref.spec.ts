import { expect, it } from "vitest";
import { createAccountRef } from "../../../../src/github-reference.js";

it("creates account objects", () => {
  expect(createAccountRef("account-a")).toEqual({ account: "account-a" });
});

it("throws for invalid account names", () => {
  expect(() => createAccountRef("account/a")).toThrow(
    'Invalid account name "account/a"',
  );
});
