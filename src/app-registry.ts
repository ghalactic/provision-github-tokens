import { isSufficientAccess, isWriteAccess } from "./access-level.js";
import type {
  App,
  Installation,
  PermissionAccess,
  PermissionName,
  Repo,
} from "./type/github-api.js";
import type { AppInputIssuer, AppInputProvisioner } from "./type/input.js";
import type { TokenRequest } from "./type/token-request.js";

export type AppRegistry = {
  readonly apps: Map<number, AppRegistration>;
  readonly installations: Map<number, InstallationRegistration>;
  registerApp: (app: AppRegistration) => void;
  registerInstallation: (installation: InstallationRegistration) => void;
  findTokenIssuers: (request: TokenRequest) => number[];
};

export type AppRegistration = {
  app: App;
  issuer: AppInputIssuer;
  provisioner: AppInputProvisioner;
};

export type InstallationRegistration = {
  installation: Installation;
  repos: Repo[];
};

export function createAppRegistry(): AppRegistry {
  const apps: Map<number, AppRegistration> = new Map();
  const installations: Map<number, InstallationRegistration> = new Map();

  return {
    apps,
    installations,

    registerApp: (registration) => {
      apps.set(registration.app.id, registration);
    },

    registerInstallation: (registration) => {
      installations.set(registration.installation.id, registration);
    },

    findTokenIssuers: (request) => {
      const tokenHasRole = typeof request.role === "string";
      const tokenPerms = Object.entries(request.permissions) as [
        PermissionName,
        PermissionAccess,
      ][];

      // Require an explicit role for write/admin access
      if (!tokenHasRole) {
        for (const [, access] of tokenPerms) {
          if (isWriteAccess(access)) return [];
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

      const issuers: number[] = [];

      for (const [, { installation, repos }] of installations) {
        const appRegistration = apps.get(installation.app_id);

        /* v8 ignore start */
        if (!appRegistration) {
          throw new Error(
            `Invariant violation: App ${installation.app_id} not registered`,
          );
        }
        /* v8 ignore stop */

        if (!appRegistration.issuer.enabled) continue;

        if (tokenHasRole) {
          let appHasRole = false;

          for (const role of appRegistration.issuer.roles) {
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
            issuers.push(installation.id);
          }

          continue;
        }

        for (const repo of repos) {
          if (repo.owner.login === request.account && tokenRepos[repo.name]) {
            ++repoMatchCount;
          }
        }

        if (repoMatchCount !== request.repos.length) continue;

        issuers.push(installation.id);
      }

      return issuers;
    },
  };
}
