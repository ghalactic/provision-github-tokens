import { expect, it } from "vitest";
import { isSufficientPermissions } from "../../../../src/permissions.js";

it("throws for empty wanted permissions", () => {
  expect(() => isSufficientPermissions({ contents: "read" }, {})).toThrow(
    "Empty permissions",
  );
});

it.each`
  have       | want
  ${"read"}  | ${"read"}
  ${"write"} | ${"read"}
  ${"write"} | ${"write"}
  ${"admin"} | ${"read"}
  ${"admin"} | ${"write"}
  ${"admin"} | ${"admin"}
`("knows that $have is sufficient for $want", ({ have, want }) => {
  expect(
    isSufficientPermissions(
      { repository_projects: have },
      { repository_projects: want },
    ),
  ).toBe(true);
});

it.each`
  have       | want
  ${"read"}  | ${"write"}
  ${"read"}  | ${"admin"}
  ${"write"} | ${"admin"}
`("knows that $have is not sufficient for $want", ({ have, want }) => {
  expect(
    isSufficientPermissions(
      { repository_projects: have },
      { repository_projects: want },
    ),
  ).toBe(false);
});

it("checks all permissions", () => {
  expect(
    isSufficientPermissions(
      { contents: "write", metadata: "read" },
      { contents: "write", metadata: "read" },
    ),
  ).toBe(true);
  expect(
    isSufficientPermissions(
      { contents: "write", metadata: "read" },
      { contents: "write", metadata: "write" },
    ),
  ).toBe(false);
  expect(
    isSufficientPermissions(
      { contents: "read", metadata: "write" },
      { contents: "write", metadata: "write" },
    ),
  ).toBe(false);
});
