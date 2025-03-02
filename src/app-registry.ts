import { isSufficientAccess, isWriteAccess } from "./access-level.js";
import { anyPatternMatches, type Pattern } from "./pattern.js";
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
  resolveIssuerAccounts: (...patterns: Pattern[]) => string[];
  resolveIssuerRepos: (...patterns: Pattern[]) => string[];
  resolveProvisionerAccounts: (...patterns: Pattern[]) => string[];
  resolveProvisionerRepos: (...patterns: Pattern[]) => string[];
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
  const apps = new Map<number, AppRegistration>();
  const appsByInstallation = new Map<
    InstallationRegistration,
    AppRegistration
  >();
  const installations = new Map<number, InstallationRegistration>();
  const issuerAccounts = new Set<string>();
  const issuerRepos = new Set<string>();
  const provisioners = new Map<number, InstallationRegistration>();
  const provisionerAccounts = new Set<string>();
  const provisionerRepos = new Set<string>();

  return {
    apps,
    installations,

    get provisioners() {
      return provisioners;
    },

    registerApp: (registration) => {
      apps.set(registration.app.id, registration);
    },

    registerInstallation: (registration) => {
      const appReg = apps.get(registration.installation.app_id);

      if (!appReg) {
        throw new Error(
          `App ${registration.installation.app_id} not registered`,
        );
      }

      const account = installationAccount(registration.installation);

      installations.set(registration.installation.id, registration);
      appsByInstallation.set(registration, appReg);

      if (appReg.issuer.enabled) {
        issuerAccounts.add(account);

        for (const { full_name } of registration.repos) {
          issuerRepos.add(full_name);
        }
      }

      if (appReg.provisioner.enabled) {
        provisioners.set(registration.installation.id, registration);
        provisionerAccounts.add(account);

        for (const { full_name } of registration.repos) {
          provisionerRepos.add(full_name);
        }
      }
    },

    resolveIssuerAccounts: (...patterns) => {
      return Array.from(issuerAccounts).filter((account) =>
        anyPatternMatches(patterns, account),
      );
    },

    resolveIssuerRepos: (...patterns) => {
      return Array.from(issuerRepos).filter((repo) =>
        anyPatternMatches(patterns, repo),
      );
    },

    resolveProvisionerAccounts: (...patterns) => {
      return Array.from(provisionerAccounts).filter((account) =>
        anyPatternMatches(patterns, account),
      );
    },

    resolveProvisionerRepos: (...patterns) => {
      return Array.from(provisionerRepos).filter((repo) =>
        anyPatternMatches(patterns, repo),
      );
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
        const appReg = appRegForInstReg(instReg);

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
          if (installationAccount(installation) === request.account) {
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
        const appReg = appRegForInstReg(instReg);

        if (!appReg.provisioner.enabled) continue;

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

        if (installationAccount(installation) === request.account) {
          provisioners.push(instReg);
        }
      }

      return provisioners;
    },
  };

  function appRegForInstReg(
    instReg: InstallationRegistration,
  ): AppRegistration {
    const appReg = appsByInstallation.get(instReg);

    /* v8 ignore start - Prevented at registration time */
    if (!appReg) {
      throw new Error(
        "Invariant violation: " +
          `App ${instReg.installation.app_id} not registered`,
      );
    }
    /* v8 ignore stop */

    return appReg;
  }

  function installationAccount(installation: Installation): string {
    /* v8 ignore start - Prevented at discovery time */
    if (
      !installation.account ||
      !("login" in installation.account) ||
      typeof installation.account.login !== "string"
    ) {
      throw new Error(
        "Invariant violation: " +
          `Installation ${installation.id} ` +
          "is not associated with a named account",
      );
    }
    /* v8 ignore stop */

    return installation.account.login;
  }
}
