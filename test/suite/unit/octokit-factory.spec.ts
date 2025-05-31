import { Octokit } from "@octokit/action";
import { expect, it } from "vitest";
import { createOctokitFactory } from "../../../src/octokit.js";
import type { AppInput } from "../../../src/type/input.js";

it("can create app octokit instances", () => {
  const appsInput: AppInput[] = [
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
  ];

  const factory = createOctokitFactory();
  const octokitA = factory.appOctokit(appsInput, 100);

  expect(octokitA).toBeInstanceOf(Octokit);
});

it("re-uses the same app octokit instance for the same credentials", () => {
  const appsInput: AppInput[] = [
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
  ];

  const factory = createOctokitFactory();
  const octokitA = factory.appOctokit(appsInput, 100);
  const octokitB = factory.appOctokit(appsInput, 100);

  expect(octokitA).toBe(octokitB);
});

it("doesn't re-use the same app octokit instance for different apps", () => {
  const appsInput: AppInput[] = [
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
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ];

  const factory = createOctokitFactory();
  const octokitA = factory.appOctokit(appsInput, 100);
  const octokitB = factory.appOctokit(appsInput, 200);

  expect(octokitA).not.toBe(octokitB);
});

it("can create installation octokit instances", () => {
  const appsInput: AppInput[] = [
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
  ];

  const factory = createOctokitFactory();
  const octokitA = factory.installationOctokit(appsInput, 100, 101);

  expect(octokitA).toBeInstanceOf(Octokit);
});

it("re-uses the same installation octokit instance for the same credentials", () => {
  const appsInput: AppInput[] = [
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
  ];

  const factory = createOctokitFactory();
  const octokitA = factory.installationOctokit(appsInput, 100, 101);
  const octokitB = factory.installationOctokit(appsInput, 100, 101);

  expect(octokitA).toBe(octokitB);
});

it("doesn't re-use the same installation octokit instance for different installations", () => {
  const appsInput: AppInput[] = [
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
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ];

  const factory = createOctokitFactory();
  const octokitA = factory.installationOctokit(appsInput, 100, 101);
  const octokitB = factory.installationOctokit(appsInput, 100, 102);
  const octokitC = factory.installationOctokit(appsInput, 200, 201);
  const octokitD = factory.installationOctokit(appsInput, 200, 202);

  expect(octokitA).not.toBe(octokitB);
  expect(octokitA).not.toBe(octokitC);
  expect(octokitA).not.toBe(octokitD);
  expect(octokitB).not.toBe(octokitC);
  expect(octokitB).not.toBe(octokitD);
  expect(octokitC).not.toBe(octokitD);
});

it("throws for non-existent app IDs", () => {
  const appsInput: AppInput[] = [
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
  ];

  const factory = createOctokitFactory();

  expect(() => {
    factory.appOctokit(appsInput, 200);
  }).toThrow("Unable to find app input for ID 200");
  expect(() => {
    factory.installationOctokit(appsInput, 200, 201);
  }).toThrow("Unable to find app input for ID 200");
});
