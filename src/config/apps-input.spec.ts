import { beforeEach, expect, it, vi } from "vitest";
import { __setInputs } from "../../__mocks__/@actions/core.js";
import { throws } from "../../test/error.js";
import type { AppInput } from "../type/input.js";
import { readAppsInput } from "./apps-input.js";

vi.mock("@actions/core");

beforeEach(() => {
  vi.resetAllMocks();
});

it("parses valid input", () => {
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

it("parses comment-only input", () => {
  __setInputs({ apps: "# no apps configured\n" });

  expect(readAppsInput()).toEqual([]);
});

it("parses empty input", () => {
  __setInputs({ apps: "" });

  expect(readAppsInput()).toEqual([]);
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

    Caused by: Invalid YAML

    Caused by: Flow map must end with a } at line 1, column 2:

    {
     ^"
  `);
});
