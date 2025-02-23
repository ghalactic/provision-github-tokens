import { isSufficientAccess, isWriteAccess } from "./access-level.js";
import type {
  App,
  Installation,
  PermissionAccess,
  PermissionName,
  Repo,
} from "./type/github-api.js";
import type { TokenRequest } from "./type/token-request.js";

export type TokenAppRegistry = {
  registerApp: (roles: string[], app: App) => void;
  registerInstallation: (installation: Installation) => void;
  registerInstallationRepos: (installationId: number, repos: Repo[]) => void;
  findInstallationForToken: (request: TokenRequest) => number | undefined;
};

export function createTokenAppRegistry(): TokenAppRegistry {
  const apps: Map<number, AppWithRoles> = new Map();
  const installations: Map<number, Installation> = new Map();
  const installationRepos: Map<Installation, Repo[]> = new Map();

  return {
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

    findInstallationForToken: (request) => {
      const tokenHasRole = typeof request.role === "string";
      const tokenPerms = Object.entries(request.permissions) as [
        PermissionName,
        PermissionAccess,
      ][];

      // Require an explicit role for write/admin access
      if (!tokenHasRole) {
        for (const [, access] of tokenPerms) {
          if (isWriteAccess(access)) return undefined;
        }
      }

      const tokenRepos: Record<string, true> = Array.isArray(request.repos)
        ? request.repos.reduce(
            (repos, name) => {
              repos[name] = true;
              return repos;
            },
            {} as Record<string, true>,
          )
        : {};

      for (const [installation, repos] of installationRepos) {
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
          if (isSufficientAccess(instAccess, access)) ++permMatchCount;
        }

        if (permMatchCount !== tokenPerms.length) continue;

        if (installation.repository_selection === "all") {
          if (
            installation.account &&
            "login" in installation.account &&
            installation.account.login === request.account
          ) {
            return installation.id;
          }

          continue;
        }

        for (const repo of repos) {
          if (repo.owner.login === request.account && tokenRepos[repo.name]) {
            ++repoMatchCount;
          }
        }

        if (repoMatchCount !== request.repos.length) continue;

        return installation.id;
      }

      return undefined;
    },
  };
}

type AppWithRoles = [string[], App];
