import { __setApps, __setInstallations } from "../__mocks__/@octokit/action.js";
import {
  createAppRegistry,
  type AppRegistration,
  type AppRegistry,
} from "../src/app-registry.js";
import type { Installation, Repo } from "../src/type/github-api.js";
import type { TestApp } from "./github-api.js";

export type TestAppRegistration = Omit<AppRegistration, "app"> & {
  app: TestApp;
};

export type TestAppRegistry = Omit<AppRegistry, "apps"> & {
  readonly apps: Map<number, TestAppRegistration>;
};

export function createTestAppRegistry(
  ...entries: {
    app: TestApp;
    installations: [Installation, Repo[]][];
    issuer?: string[];
    provisioner?: boolean;
  }[]
): TestAppRegistry {
  const appRegistry = createAppRegistry();
  const allApps: TestApp[] = [];
  const allInstallations: [Installation, Repo[]][] = [];

  for (const {
    app,
    issuer: roles,
    provisioner = false,
    installations,
  } of entries) {
    appRegistry.registerApp({
      app,
      issuer: roles ? { enabled: true, roles } : { enabled: false, roles: [] },
      provisioner: { enabled: provisioner },
    });

    allApps.push(app);

    for (const [installation, repos] of installations) {
      appRegistry.registerInstallation({ installation, repos });
      allInstallations.push([installation, repos]);
    }
  }

  __setApps(allApps);
  __setInstallations(allInstallations);

  return appRegistry as TestAppRegistry;
}
