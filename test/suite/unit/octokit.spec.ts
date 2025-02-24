import { Octokit } from "@octokit/action";
import { expect, it } from "vitest";
import { createOctokitFactory } from "../../../src/octokit.js";

it("can create app octokit instances", () => {
  const factory = createOctokitFactory();

  const octokitA = factory.appOctokit({
    appId: "100",
    privateKey: "<private key A>",
    issuer: {
      enabled: true,
      roles: [],
    },
    provisioner: {
      enabled: false,
    },
  });

  expect(octokitA).toBeInstanceOf(Octokit);
});

it("re-uses the same app octokit instance for the same credentials", () => {
  const factory = createOctokitFactory();

  const octokitA = factory.appOctokit({
    appId: "100",
    privateKey: "<private key A>",
    issuer: {
      enabled: true,
      roles: [],
    },
    provisioner: {
      enabled: false,
    },
  });
  const octokitB = factory.appOctokit({
    appId: "100",
    privateKey: "<private key A>",
    issuer: {
      enabled: true,
      roles: [],
    },
    provisioner: {
      enabled: false,
    },
  });

  expect(octokitA).toBe(octokitB);
});

it("doesn't re-use the same app octokit instance for different credentials", () => {
  const factory = createOctokitFactory();

  const octokitA = factory.appOctokit({
    appId: "100",
    privateKey: "<private key A>",
    issuer: {
      enabled: true,
      roles: [],
    },
    provisioner: {
      enabled: false,
    },
  });
  const octokitB = factory.appOctokit({
    appId: "200",
    privateKey: "<private key A>",
    issuer: {
      enabled: true,
      roles: [],
    },
    provisioner: {
      enabled: false,
    },
  });
  const octokitC = factory.appOctokit({
    appId: "100",
    privateKey: "<private key B>",
    issuer: {
      enabled: true,
      roles: [],
    },
    provisioner: {
      enabled: false,
    },
  });

  expect(octokitA).not.toBe(octokitB);
  expect(octokitA).not.toBe(octokitC);
  expect(octokitB).not.toBe(octokitC);
});

it("can create installation octokit instances", () => {
  const factory = createOctokitFactory();

  const octokitA = factory.installationOctokit(
    {
      appId: "100",
      privateKey: "<private key A>",
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    101,
  );

  expect(octokitA).toBeInstanceOf(Octokit);
});

it("re-uses the same installation octokit instance for the same credentials", () => {
  const factory = createOctokitFactory();

  const octokitA = factory.installationOctokit(
    {
      appId: "100",
      privateKey: "<private key A>",
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    101,
  );
  const octokitB = factory.installationOctokit(
    {
      appId: "100",
      privateKey: "<private key A>",
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    101,
  );

  expect(octokitA).toBe(octokitB);
});

it("doesn't re-use the same installation octokit instance for different credentials", () => {
  const factory = createOctokitFactory();

  const octokitA = factory.installationOctokit(
    {
      appId: "100",
      privateKey: "<private key A>",
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    101,
  );
  const octokitB = factory.installationOctokit(
    {
      appId: "200",
      privateKey: "<private key A>",
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    101,
  );
  const octokitC = factory.installationOctokit(
    {
      appId: "100",
      privateKey: "<private key B>",
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    101,
  );
  const octokitD = factory.installationOctokit(
    {
      appId: "100",
      privateKey: "<private key A>",
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    102,
  );

  expect(octokitA).not.toBe(octokitB);
  expect(octokitA).not.toBe(octokitC);
  expect(octokitA).not.toBe(octokitD);
  expect(octokitB).not.toBe(octokitC);
  expect(octokitB).not.toBe(octokitD);
  expect(octokitC).not.toBe(octokitD);
});
