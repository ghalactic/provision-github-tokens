import {
  createFindIssuerOctokit,
  type FindIssuerOctokit,
} from "../src/issuer-octokit.js";
import { createOctokitFactory, type OctokitFactory } from "../src/octokit.js";
import {
  createFindProvisionerOctokit,
  type FindProvisionerOctokit,
} from "../src/provisioner-octokit.js";
import type { TestAppRegistry } from "./app-registry.js";

export function createTestOctokitFactory(appRegistry: TestAppRegistry): {
  octokitFactory: OctokitFactory;
  findIssuerOctokit: FindIssuerOctokit;
  findProvisionerOctokit: FindProvisionerOctokit;
} {
  const octokitFactory = createOctokitFactory();
  const appsInput = [...appRegistry.apps.values()].map((reg) => ({
    appId: reg.app.id,
    privateKey: reg.app.privateKey,
    issuer: reg.issuer,
    provisioner: reg.provisioner,
  }));

  return {
    octokitFactory,
    findIssuerOctokit: createFindIssuerOctokit(
      octokitFactory,
      appRegistry,
      appsInput,
    ),
    findProvisionerOctokit: createFindProvisionerOctokit(
      octokitFactory,
      appRegistry,
      appsInput,
    ),
  };
}
