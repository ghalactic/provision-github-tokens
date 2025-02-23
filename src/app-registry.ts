import type { App, Installation, Repo } from "./type/github-api.js";

export type AppRegistry = {
  readonly apps: Map<number, AppWithRoles>;
  readonly installations: Map<number, Installation>;
  readonly installationRepos: Map<Installation, Repo[]>;
  registerApp: (roles: string[], app: App) => void;
  registerInstallation: (installation: Installation) => void;
  registerInstallationRepos: (installationId: number, repos: Repo[]) => void;
};

export function createAppRegistry(): AppRegistry {
  const apps: Map<number, AppWithRoles> = new Map();
  const installations: Map<number, Installation> = new Map();
  const installationRepos: Map<Installation, Repo[]> = new Map();

  return {
    apps,
    installations,
    installationRepos,

    registerApp: (roles, app) => {
      apps.set(app.id, [roles, app]);
    },

    registerInstallation: (installation) => {
      installations.set(installation.id, installation);
    },

    registerInstallationRepos: (installationId, repos) => {
      const installation = installations.get(installationId);
      if (!installation) {
        throw new Error(`Installation ${installationId} not registered`);
      }

      installationRepos.set(installation, repos);
    },
  };
}

type AppWithRoles = [roles: string[], app: App];
