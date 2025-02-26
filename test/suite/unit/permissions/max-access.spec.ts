import { expect, it } from "vitest";
import { maxAccess } from "../../../../src/access-level.js";

it('returns "none" for empty permissions', () => {
  expect(maxAccess({})).toBe("none");
  expect(maxAccess({ contents: undefined, metadata: undefined })).toBe("none");
  expect(maxAccess({ contents: "none", metadata: "none" })).toBe("none");
});

it('returns "read" for read-only permissions', () => {
  expect(
    maxAccess({
      contents: undefined,
      metadata: "none",
      repository_hooks: "read",
      repository_projects: "read",
    }),
  ).toBe("read");
});

it('returns "write" for write permissions', () => {
  expect(
    maxAccess({
      contents: undefined,
      metadata: "none",
      repository_hooks: "read",
      repository_projects: "write",
    }),
  ).toBe("write");
});

it('returns "admin" for admin permissions', () => {
  expect(
    maxAccess({
      contents: undefined,
      metadata: "none",
      repository_hooks: "write",
      repository_projects: "admin",
      secret_scanning_alerts: "read",
    }),
  ).toBe("admin");
});
