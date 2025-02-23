import { getInput } from "@actions/core";
import { beforeEach, expect, it, vi } from "vitest";
import { readProvisionAppsInput } from "../../../src/config/provision-apps-input.js";
import type { AppsInputApp } from "../../../src/type/input.js";
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
  `);

  expect(readProvisionAppsInput()).toEqual([
    {
      appId: "100",
      privateKey: "<private key A>",
    },
    {
      appId: "200",
      privateKey: "<private key B>",
    },
  ] satisfies AppsInputApp[]);
});

it("throws if the input doesn't match the schema", () => {
  vi.mocked(getInput).mockReturnValue(`
    - appId: 100
      privateKey: <private key A>
  `);

  expect(
    throws(() => {
      readProvisionAppsInput();
    }),
  ).toMatchInlineSnapshot(`
    "Validation of provisionApps action input failed

    Caused by: Invalid provisionApps input:
      - must be string (/0/appId)"
  `);
});

it("throws if the input isn't valid YAML", () => {
  vi.mocked(getInput).mockReturnValue("{");

  expect(
    throws(() => {
      readProvisionAppsInput();
    }),
  ).toMatchInlineSnapshot(`
    "Parsing of provisionApps action input failed

    Caused by: unexpected end of the stream within a flow collection (2:1)

     1 | {
     2 |
    -----^"
  `);
});
