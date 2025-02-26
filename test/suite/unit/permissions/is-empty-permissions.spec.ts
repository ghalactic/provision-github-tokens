import { expect, it } from "vitest";
import { isEmptyPermissions } from "../../../../src/permissions.js";

it("returns true for empty permissions", () => {
  expect(isEmptyPermissions({})).toBe(true);
  expect(isEmptyPermissions({ contents: undefined, metadata: undefined })).toBe(
    true,
  );
  expect(isEmptyPermissions({ contents: "none", metadata: "none" })).toBe(true);
  expect(isEmptyPermissions({ contents: "none", metadata: undefined })).toBe(
    true,
  );
});

it("returns false for non-empty permissions", () => {
  expect(isEmptyPermissions({ contents: undefined, metadata: "read" })).toBe(
    false,
  );
  expect(isEmptyPermissions({ contents: "none", metadata: "write" })).toBe(
    false,
  );
  expect(isEmptyPermissions({ repository_projects: "admin" })).toBe(false);
});
