import { beforeEach, expect, it, vi } from "vitest";
import { __setInputs } from "../../../__mocks__/@actions/core.js";
import { readAppsInput } from "../../../src/config/apps-input.js";
import type { AppInput } from "../../../src/type/input.js";
import { throws } from "../../error.js";

vi.mock("@actions/core");

beforeEach(() => {
  vi.resetAllMocks();
});

it("can parse valid input", () => {
  __setInputs({
    apps: `
      - appId: 100
        privateKey: <private key A>
        issuer:
          enabled: true
          roles: []
        provisioner:
          enabled: false
      - appId: "200"
        privateKey: <private key B>
        issuer:
          enabled: true
          roles: ["role-a", "role-b"]
      - appId: 300
        privateKey: <private key C>
        provisioner:
          enabled: true
  `,
  });

  expect(readAppsInput()).toEqual([
    {
      appId: 100,
      privateKey: "<private key A>",
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    {
      appId: 200,
      privateKey: "<private key B>",
      issuer: {
        enabled: true,
        roles: ["role-a", "role-b"],
      },
      provisioner: {
        enabled: false,
      },
    },
    {
      appId: 300,
      privateKey: "<private key C>",
      issuer: {
        enabled: false,
        roles: [],
      },
      provisioner: {
        enabled: true,
      },
    },
  ] satisfies AppInput[]);
});

it("throws if the input doesn't match the schema", () => {
  __setInputs({
    apps: `
      - appId: 0.100
        privateKey: <private key A>
        issuer:
          enabled: true
          roles: []
  `,
  });

  expect(
    throws(() => {
      readAppsInput();
    }),
  ).toMatchInlineSnapshot(`
    "Parsing of apps action input failed

    Caused by: Invalid apps input:
      - must be a GitHub app ID (/0/appId)"
  `);
});

it("throws if the input isn't valid YAML", () => {
  __setInputs({ apps: "{" });

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
