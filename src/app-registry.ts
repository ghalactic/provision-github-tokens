import type {
  App,
  Installation,
  PermissionAccess,
  PermissionName,
  Repository,
} from "./type/github-api.js";
import type { TokenRequest } from "./type/token-request.js";

const ACCESS_RANK = {
  read: 1,
  write: 2,
  admin: 3,
} as const;

export type AppRegistry = {
  registerApp: (roles: string[], app: App) => void;
  registerInstallation: (installation: Installation) => void;
  registerInstallationRepositories: (
    installationId: number,
    repositories: Repository[],
  ) => void;

  findInstallationForToken: (request: TokenRequest) => number | undefined;
};

export function createAppRegistry(): AppRegistry {
  const apps: Map<number, AppWithRoles> = new Map();
  const installations: Map<number, Installation> = new Map();
  const installationRepos: Map<Installation, Repository[]> = new Map();

  return {
    registerApp: (roles, app) => {
      apps.set(app.id, [roles, app]);
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
      const tokenHasRole = typeof request.role === "string";
      const tokenPerms = Object.entries(request.permissions) as [
        PermissionName,
        PermissionAccess,
      ][];

      // Require an explicit role for write/admin access
      if (!tokenHasRole) {
        for (const [, access] of tokenPerms) {
          if (ACCESS_RANK[access] > ACCESS_RANK.read) return undefined;
        }
      }

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

      for (const [installation, repositories] of installationRepos) {
        const appWithRoles = apps.get(installation.app_id);

        /* v8 ignore start */
        if (!appWithRoles) {
          throw new Error(
            `Invariant violation: App ${installation.app_id} not registered`,
          );
        }
        /* v8 ignore stop */

        const [appRoles] = appWithRoles;

        if (tokenHasRole) {
          let appHasRole = false;

          for (const role of appRoles) {
            if (role === request.role) {
              appHasRole = true;
              break;
            }
          }

          if (!appHasRole) continue;
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

type AppWithRoles = [string[], App];
