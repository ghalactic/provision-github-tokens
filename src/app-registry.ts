import { isSufficientAccess, isWriteAccess } from "./access-level.js";
import {
  isRepoRef,
  type AccountOrRepoReference,
  type AccountReference,
  type RepoReference,
} from "./github-reference.js";
import { anyPatternMatches, type Pattern } from "./pattern.js";
import { isEmptyPermissions, permissionAccess } from "./permissions.js";
import type { TokenRequest } from "./token-request.js";
import type { App, Installation, Repo } from "./type/github-api.js";
import type { AppInputIssuer, AppInputProvisioner } from "./type/input.js";

export type AppRegistry = {
  readonly apps: Map<number, AppRegistration>;
  readonly installations: Map<number, InstallationRegistration>;
  readonly provisioners: Map<number, InstallationRegistration>;
  registerApp: (app: AppRegistration) => void;
  registerInstallation: (installation: InstallationRegistration) => void;
  resolveIssuerAccounts: (patterns: Pattern[]) => string[];
  resolveIssuerRepos: (patterns: Pattern[]) => string[];
  resolveProvisionerAccounts: (patterns: Pattern[]) => string[];
  resolveProvisionerRepos: (patterns: Pattern[]) => string[];
  findIssuersForRequest: (request: TokenRequest) => InstallationRegistration[];
  findProvisionersForAccount: (
    account: AccountReference,
  ) => InstallationRegistration[];
  findProvisionersForRepo: (repo: RepoReference) => InstallationRegistration[];
  findProvisionersForAccountOrRepo: (
    accountOrRepo: AccountOrRepoReference,
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
  const issuers = new Map<number, InstallationRegistration>();
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
        issuers.set(registration.installation.id, registration);
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

    resolveIssuerAccounts: (patterns) => {
      return Array.from(issuerAccounts).filter((account) =>
        anyPatternMatches(patterns, account),
      );
    },

    resolveIssuerRepos: (patterns) => {
      return Array.from(issuerRepos).filter((repo) =>
        anyPatternMatches(patterns, repo),
      );
    },

    resolveProvisionerAccounts: (patterns) => {
      return Array.from(provisionerAccounts).filter((account) =>
        anyPatternMatches(patterns, account),
      );
    },

    resolveProvisionerRepos: (patterns) => {
      return Array.from(provisionerRepos).filter((repo) =>
        anyPatternMatches(patterns, repo),
      );
    },

    findIssuersForRequest: (request) => {
      // Disallow empty permissions requests
      if (isEmptyPermissions(request.tokenDec.permissions)) return [];

      const tokenHasRole = typeof request.tokenDec.as === "string";
      const tokenPerms = Object.keys(request.tokenDec.permissions);

      // Require an explicit role for write/admin access
      if (!tokenHasRole) {
        for (const permission of tokenPerms) {
          if (
            isWriteAccess(
              permissionAccess(request.tokenDec.permissions, permission),
            )
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

      const found: InstallationRegistration[] = [];

      for (const [, instReg] of issuers) {
        const { installation, repos } = instReg;
        const appReg = appRegForInstReg(instReg);

        if (tokenHasRole) {
          let appHasRole = false;

          for (const role of appReg.issuer.roles) {
            if (role === request.tokenDec.as) {
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
              permissionAccess(request.tokenDec.permissions, permission),
            )
          ) {
            ++permMatchCount;
          }
        }

        if (permMatchCount !== tokenPerms.length) continue;

        if (installation.repository_selection === "all") {
          if (installationAccount(installation) === request.tokenDec.account) {
            found.push(instReg);
          }

          continue;
        }

        for (const repo of repos) {
          if (
            repo.owner.login === request.tokenDec.account &&
            tokenRepos[repo.name]
          ) {
            ++repoMatchCount;
          }
        }

        if (repoMatchCount !== request.repos.length) continue;

        found.push(instReg);
      }

      return found;
    },

    findProvisionersForAccount,
    findProvisionersForRepo,

    findProvisionersForAccountOrRepo: (target) => {
      return isRepoRef(target)
        ? findProvisionersForRepo(target)
        : findProvisionersForAccount(target);
    },
  };

  function findProvisionersForAccount(
    account: AccountReference,
  ): InstallationRegistration[] {
    const found: InstallationRegistration[] = [];

    for (const [, instReg] of provisioners) {
      const { installation } = instReg;

      if (installationAccount(installation) === account.account) {
        found.push(instReg);
      }
    }

    return found;
  }

  function findProvisionersForRepo(
    repo: RepoReference,
  ): InstallationRegistration[] {
    const found: InstallationRegistration[] = [];

    for (const [, instReg] of provisioners) {
      const { repos } = instReg;

      for (const r of repos) {
        if (r.owner.login === repo.account && r.name === repo.repo) {
          found.push(instReg);

          break;
        }
      }
    }

    return found;
  }

  function appRegForInstReg(
    instReg: InstallationRegistration,
  ): AppRegistration {
    const appReg = appsByInstallation.get(instReg);

    /* istanbul ignore next - Prevented at registration time - @preserve */
    if (!appReg) {
      throw new Error(
        "Invariant violation: " +
          `App ${instReg.installation.app_id} not registered`,
      );
    }

    return appReg;
  }

  function installationAccount(installation: Installation): string {
    /* istanbul ignore next - Prevented at discovery time - @preserve*/
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

    return installation.account.login;
  }
}
