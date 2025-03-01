import { isSufficientAccess, isWriteAccess } from "./access-level.js";
import { isEmptyPermissions, permissionAccess } from "./permissions.js";
import type { App, Installation, Repo } from "./type/github-api.js";
import type { AppInputIssuer, AppInputProvisioner } from "./type/input.js";
import type { ProvisionRequest } from "./type/provision-request.js";
import type { TokenRequest } from "./type/token-request.js";

export type AppRegistry = {
  readonly apps: Map<number, AppRegistration>;
  readonly installations: Map<number, InstallationRegistration>;
  readonly provisioners: Map<number, InstallationRegistration>;
  registerApp: (app: AppRegistration) => void;
  registerInstallation: (installation: InstallationRegistration) => void;
  findIssuersForRequest: (request: TokenRequest) => InstallationRegistration[];
  findProvisionersForRequest: (
    request: ProvisionRequest,
  ) => InstallationRegistration[];
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

    get provisioners() {
      const provisioners = new Map<number, InstallationRegistration>();

      for (const [instId, instReg] of installations) {
        const { installation } = instReg;
        const appReg = apps.get(installation.app_id);

        /* v8 ignore start */
        if (!appReg) {
          throw new Error(
            `Invariant violation: App ${installation.app_id} not registered`,
          );
        }
        /* v8 ignore stop */

        if (appReg.provisioner.enabled) provisioners.set(instId, instReg);
      }

      return provisioners;
    },

    registerApp: (registration) => {
      apps.set(registration.app.id, registration);
    },

    registerInstallation: (registration) => {
      installations.set(registration.installation.id, registration);
    },

    findIssuersForRequest: (request) => {
      // Disallow empty permissions requests
      if (isEmptyPermissions(request.permissions)) return [];

      const tokenHasRole = typeof request.role === "string";
      const tokenPerms = Object.keys(request.permissions);

      // Require an explicit role for write/admin access
      if (!tokenHasRole) {
        for (const permission of tokenPerms) {
          if (
            isWriteAccess(permissionAccess(request.permissions, permission))
          ) {
            return [];
          }
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

      const issuers: InstallationRegistration[] = [];

      for (const [, instReg] of installations) {
        const { installation, repos } = instReg;
        const appReg = apps.get(installation.app_id);

        /* v8 ignore start */
        if (!appReg) {
          throw new Error(
            `Invariant violation: App ${installation.app_id} not registered`,
          );
        }
        /* v8 ignore stop */

        if (!appReg.issuer.enabled) continue;

        if (tokenHasRole) {
          let appHasRole = false;

          for (const role of appReg.issuer.roles) {
            if (role === request.role) {
              appHasRole = true;
              break;
            }
          }

          if (!appHasRole) continue;
        }

        let permMatchCount = 0;
        let repoMatchCount = 0;

        for (const permission of tokenPerms) {
          if (
            isSufficientAccess(
              permissionAccess(installation.permissions, permission),
              permissionAccess(request.permissions, permission),
            )
          ) {
            ++permMatchCount;
          }
        }

        if (permMatchCount !== tokenPerms.length) continue;

        if (installation.repository_selection === "all") {
          if (
            installation.account &&
            "login" in installation.account &&
            installation.account.login === request.account
          ) {
            issuers.push(instReg);
          }

          continue;
        }

        for (const repo of repos) {
          if (repo.owner.login === request.account && tokenRepos[repo.name]) {
            ++repoMatchCount;
          }
        }

        if (repoMatchCount !== request.repos.length) continue;

        issuers.push(instReg);
      }

      return issuers;
    },

    findProvisionersForRequest: (request) => {
      const provisioners: InstallationRegistration[] = [];

      for (const [, instReg] of installations) {
        const { installation, repos } = instReg;
        const appRegistration = apps.get(installation.app_id);

        /* v8 ignore start */
        if (!appRegistration) {
          throw new Error(
            `Invariant violation: App ${installation.app_id} not registered`,
          );
        }
        /* v8 ignore stop */

        if (!appRegistration.provisioner.enabled) continue;

        if (request.repo) {
          for (const repo of repos) {
            if (
              repo.owner.login === request.account &&
              repo.name === request.repo
            ) {
              provisioners.push(instReg);

              break;
            }
          }

          continue;
        }

        if (
          installation.account &&
          "login" in installation.account &&
          installation.account.login === request.account
        ) {
          provisioners.push(instReg);
        }
      }

      return provisioners;
    },
  };
}
