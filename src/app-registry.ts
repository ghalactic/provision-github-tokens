import type {
  App,
  Installation,
  PermissionAccess,
  PermissionName,
  Repository,
} from "./api-data.js";
import type { TokenRequest } from "./token-request.js";

const ACCESS_RANK = {
  read: 1,
  write: 2,
  admin: 3,
} as const;

export type AppRegistry = {
  registerApp: (app: App) => void;
  registerInstallation: (installation: Installation) => void;
  registerInstallationRepositories: (
    installationId: number,
    repositories: Repository[],
  ) => void;

  findInstallationForToken: (request: TokenRequest) => number | undefined;
};

export function createAppRegistry(): AppRegistry {
  const apps: Map<number, App> = new Map();
  const installations: Map<number, Installation> = new Map();
  const installationRepos: Map<Installation, Repository[]> = new Map();

  return {
    registerApp: (app) => {
      apps.set(app.id, app);
    },

    registerInstallation: (installation) => {
      installations.set(installation.id, installation);
    },

    registerInstallationRepositories: (installationId, repositories) => {
      const installation = installations.get(installationId);
      if (!installation) {
        throw new Error(`Installation ${installationId} not registered`);
      }

      installationRepos.set(installation, repositories);
    },

    findInstallationForToken: (request) => {
      const tokenRepos: Record<string, true> = Array.isArray(
        request.repositories,
      )
        ? request.repositories.reduce(
            (repositories, name) => {
              repositories[name] = true;
              return repositories;
            },
            {} as Record<string, true>,
          )
        : {};

      const tokenPerms = Object.entries(request.permissions) as [
        PermissionName,
        PermissionAccess,
      ][];

      for (const [installation, repositories] of installationRepos) {
        if (
          typeof request.app === "number" &&
          installation.app_id !== request.app
        ) {
          continue;
        }

        if (
          typeof request.app === "string" &&
          installation.app_slug !== request.app
        ) {
          continue;
        }

        let permMatchCount = 0;
        let repoMatchCount = 0;

        for (const [name, access] of tokenPerms) {
          const instAccess = installation.permissions[name];
          if (!instAccess) continue;
          if (ACCESS_RANK[instAccess] >= ACCESS_RANK[access]) ++permMatchCount;
        }

        if (permMatchCount !== tokenPerms.length) continue;
        if (installation.repository_selection === "all") return installation.id;

        for (const repository of repositories) {
          if (
            repository.owner.login === request.owner &&
            tokenRepos[repository.name]
          ) {
            ++repoMatchCount;
          }
        }

        if (repoMatchCount !== request.repositories.length) continue;

        return installation.id;
      }

      return undefined;
    },
  };
}
