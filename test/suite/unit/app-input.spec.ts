import { getInput } from "@actions/core";
import { beforeEach, expect, it, vi } from "vitest";
import { readAppsInput } from "../../../src/config/apps-input.js";
import type { AppInput } from "../../../src/type/input.js";
import { throws } from "../../error.js";

vi.mock("@actions/core");

beforeEach(() => {
  vi.resetAllMocks();
});

it("can parse valid input", () => {
  vi.mocked(getInput).mockReturnValue(`
    - appId: "100"
      privateKey: <private key A>
    - appId: "200"
      privateKey: <private key B>
      roles: []
    - appId: "300"
      privateKey: <private key C>
      roles: ["role-a", "role-b"]
  `);

  expect(readAppsInput()).toEqual([
    {
      appId: "100",
      privateKey: "<private key A>",
      roles: [],
    },
    {
      appId: "200",
      privateKey: "<private key B>",
      roles: [],
    },
    {
      appId: "300",
      privateKey: "<private key C>",
      roles: ["role-a", "role-b"],
    },
  ] satisfies AppInput[]);
});

it("throws if the input doesn't match the schema", () => {
  vi.mocked(getInput).mockReturnValue(`
    - appId: 100
      privateKey: <private key A>
  `);

  expect(
    throws(() => {
      readAppsInput();
    }),
  ).toMatchInlineSnapshot(`
    "Validation of apps action input failed

    Caused by: Invalid apps input:
      - must be string (/0/appId)"
  `);
});

it("throws if the input isn't valid YAML", () => {
  vi.mocked(getInput).mockReturnValue("{");

  expect(
    throws(() => {
      readAppsInput();
    }),
  ).toMatchInlineSnapshot(`
    "Parsing of apps action input failed

    Caused by: unexpected end of the stream within a flow collection (2:1)

     1 | {
     2 |
    -----^"
  `);
});
