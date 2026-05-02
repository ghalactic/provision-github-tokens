import { expect, it } from "vitest";
import { isWriteAccess } from "./access-level.js";

it("knows that admin is write access", () => {
  expect(isWriteAccess("admin")).toBe(true);
});

it("knows that write is write access", () => {
  expect(isWriteAccess("write")).toBe(true);
});

it("knows that read isn't write access", () => {
  expect(isWriteAccess("read")).toBe(false);
});

it("knows that none isn't write access", () => {
  expect(isWriteAccess("none")).toBe(false);
});
