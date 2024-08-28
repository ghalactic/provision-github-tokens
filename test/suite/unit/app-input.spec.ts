import { getInput } from "@actions/core";
import { beforeEach, expect, it, vi } from "vitest";
import { readAppsInput } from "../../../src/config/apps-input.js";
import type { AppInput } from "../../../src/type/input.js";

vi.mock("@actions/core");

beforeEach(() => {
  vi.resetAllMocks();
});

it("can parse valid input", () => {
  vi.mocked(getInput).mockReturnValue(`
    - appId: "111111"
      privateKey: <private key A>
    - appId: "222222"
      privateKey: <private key B>
      roles: []
    - appId: "333333"
      privateKey: <private key C>
      roles: ["role-a", "role-b"]
  `);

  expect(readAppsInput()).toEqual([
    {
      appId: "111111",
      privateKey: "<private key A>",
      roles: [],
    },
    {
      appId: "222222",
      privateKey: "<private key B>",
      roles: [],
    },
    {
      appId: "333333",
      privateKey: "<private key C>",
      roles: ["role-a", "role-b"],
    },
  ] satisfies AppInput[]);
});

it("throws if the input doesn't match the schema", () => {
  vi.mocked(getInput).mockReturnValue(`
    - appId: 111111
      privateKey: <private key A>
  `);

  expect(() => {
    readAppsInput();
  }).toThrow("Invalid apps input");
});

it("throws if the input isn't valid YAML", () => {
  vi.mocked(getInput).mockReturnValue("{");

  expect(() => {
    readAppsInput();
  }).toThrow("Parsing of apps action input failed");
});
