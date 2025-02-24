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
  registerApp: (
    issuer: AppInputIssuer,
    provisioner: AppInputProvisioner,
    app: App,
  ) => void;
  registerInstallation: (installation: Installation) => void;
  registerInstallationRepos: (installationId: number, repos: Repo[]) => void;
  findTokenIssuers: (request: TokenRequest) => number[];
};

export function createAppRegistry(): AppRegistry {
  const apps: Map<number, RegisteredApp> = new Map();
  const installations: Map<number, Installation> = new Map();
  const installationRepos: Map<Installation, Repo[]> = new Map();

  return {
    registerApp: (issuer, provisioner, app) => {
      apps.set(app.id, { issuer, provisioner, app });
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

      for (const [installation, repos] of installationRepos) {
        const registered = apps.get(installation.app_id);

        /* v8 ignore start */
        if (!registered) {
          throw new Error(
            `Invariant violation: App ${installation.app_id} not registered`,
          );
        }
        /* v8 ignore stop */

        if (!registered.issuer.enabled) continue;

        if (tokenHasRole) {
          let appHasRole = false;

          for (const role of registered.issuer.roles) {
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

type RegisteredApp = {
  issuer: AppInputIssuer;
  provisioner: AppInputProvisioner;
  app: App;
};
