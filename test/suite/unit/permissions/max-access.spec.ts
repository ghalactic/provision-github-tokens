import { expect, it } from "vitest";
import { maxAccess } from "../../../../src/access-level.js";

it("throws for empty permissions", () => {
  expect(() => {
    maxAccess({});
  }).toThrow("Empty permissions");
});

it('returns "read" for read-only permissions', () => {
  expect(
    maxAccess({
      repository_hooks: "read",
      repository_projects: "read",
    }),
  ).toBe("read");
});

it('returns "write" for write permissions', () => {
  expect(
    maxAccess({
      repository_hooks: "read",
      repository_projects: "write",
    }),
  ).toBe("write");
});

it('returns "admin" for admin permissions', () => {
  expect(
    maxAccess({
      repository_hooks: "write",
      repository_projects: "admin",
      secret_scanning_alerts: "read",
    }),
  ).toBe("admin");
});
