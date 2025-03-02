import { debug, info, error as logError, warning } from "@actions/core";
import type { AppRegistry } from "./app-registry.js";
import { errorMessage } from "./error.js";
import {
  handleRequestError,
  type Octokit,
  type OctokitFactory,
} from "./octokit.js";
import { isEmptyPermissions } from "./permissions.js";
import { pluralize } from "./pluralize.js";
import type { App, Installation, InstallationRepo } from "./type/github-api.js";
import type { AppInput } from "./type/input.js";

export async function discoverApps(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
): Promise<void> {
  let appIndex = 0;
  let appCount = 0;
  let instCount = 0;

  for (const appInput of appsInput) {
    try {
      instCount += await discoverApp(
        octokitFactory,
        appRegistry,
        appsInput,
        appInput,
        appIndex++,
      );

      ++appCount;
    } catch (cause) {
      debug(`Failed to discover app ${appInput.appId}: ${errorMessage(cause)}`);
      logError(`Failed to discover app at index ${appIndex}`);
    }
  }

  info(
    "Discovered " +
      `${instCount} ${pluralize(instCount, "installation", "installations")} ` +
      "of " +
      `${appCount} ${pluralize(appCount, "app", "apps")}`,
  );
}

async function discoverApp(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
  appInput: AppInput,
  appIndex: number,
): Promise<number> {
  if (!appInput.issuer.enabled && !appInput.provisioner.enabled) {
    debug(`Skipping discovery of disabled app ${appInput.appId}`);

    return 0;
  }

  const appOctokit = octokitFactory.appOctokit(appsInput, appInput.appId);
  let app: App | null;

  try {
    ({ data: app } = await appOctokit.rest.apps.getAuthenticated());
  } catch (error) {
    handleRequestError(error, {
      401: () => {
        debug(`App ${appInput.appId} has incorrect credentials - skipping`);
        warning(
          `App at index ${appIndex} has incorrect credentials - skipping`,
        );
      },
      404: () => {
        debug(`App ${appInput.appId} not found - skipping`);
        warning(`App at index ${appIndex} not found - skipping`);
      },
    });

    return 0;
  }

  /* v8 ignore start */
  if (!app) {
    debug(`App ${appInput.appId} can't access itself`);

    throw new Error(
      `Invariant violation: App at index ${appIndex} can't access itself`,
    );
  }
  /* v8 ignore stop */

  debug(`Discovered app ${JSON.stringify(app.name)} (${app.slug} / ${app.id})`);

  if (appInput.issuer.enabled) {
    const roles =
      appInput.issuer.roles.length < 1
        ? "no roles"
        : `roles ${JSON.stringify(appInput.issuer.roles)}`;

    debug(`App ${app.id} is a token issuer with ${roles}`);
  }

  if (appInput.provisioner.enabled) {
    debug(`App ${app.id} is a token provisioner`);
  }

  appRegistry.registerApp({
    app,
    issuer: appInput.issuer,
    provisioner: appInput.provisioner,
  });

  const [instSuccessCount, instFailureCount] = await discoverInstallations(
    octokitFactory,
    appRegistry,
    appsInput,
    appInput,
    appOctokit,
    app,
    appIndex,
  );

  debug(
    `Discovered ${instSuccessCount} ` +
      `${pluralize(instSuccessCount, "installation", "installations")} ` +
      `of ${JSON.stringify(app.name)}`,
  );

  if (instFailureCount > 0) {
    debug(
      `Failed to discover ${instFailureCount} ` +
        `${pluralize(instFailureCount, "installation", "installations")} ` +
        `of ${JSON.stringify(app.name)}`,
    );
  }

  return instSuccessCount;
}

async function discoverInstallations(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
  appInput: AppInput,
  appOctokit: Octokit,
  app: App,
  appIndex: number,
): Promise<[successCount: number, failureCount: number]> {
  const installationPages = appOctokit.paginate.iterator(
    appOctokit.rest.apps.listInstallations,
  );
  let successCount = 0;
  let failureCount = 0;

  for await (const { data: installations } of installationPages) {
    for (const installation of installations) {
      try {
        await discoverInstallation(
          octokitFactory,
          appRegistry,
          appsInput,
          appInput,
          installation,
        );
        ++successCount;
      } catch (cause) {
        ++failureCount;
        debug(
          `Failed to discover installation ${installation.id} ` +
            `for app ${appInput.appId}: ${errorMessage(cause)}`,
        );
        logError(
          `Failed to discover installation for app at index ${appIndex}`,
        );
      }
    }
  }

  return [successCount, failureCount];
}

async function discoverInstallation(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
  appInput: AppInput,
  installation: Installation,
): Promise<void> {
  const {
    id: installationId,
    repository_selection,
    permissions,
  } = installation;

  const installationOctokit = octokitFactory.installationOctokit(
    appsInput,
    appInput.appId,
    installationId,
  );

  const repoPages = installationOctokit.paginate.iterator(
    installationOctokit.rest.apps.listReposAccessibleToInstallation,
  );
  const repos: InstallationRepo[] = [];
  const repoNames: string[] = [];

  for await (const { data } of repoPages) {
    for (const repo of data) {
      repos.push(repo);
      repoNames.push(repo.full_name);
    }
  }

  /* v8 ignore start - never seen without an account login */
  const account =
    installation.account && "login" in installation.account
      ? installation.account.login
      : undefined;

  if (account == null) {
    debug(
      `Skipping discovery of app installation ${installationId} ` +
        ` because it is not associated with a named account`,
    );

    return;
  }
  /* v8 ignore stop */

  debug(`Discovered app installation ${installationId} for account ${account}`);

  if (isEmptyPermissions(permissions)) {
    debug(`Installation ${installationId} has no permissions`);
  } else {
    debug(
      `Installation ${installationId} has permissions ` +
        `${JSON.stringify(permissions)}`,
    );
  }

  if (repository_selection === "all") {
    debug(
      `Installation ${installationId} has access to all repos ` +
        `${JSON.stringify(repoNames)}`,
    );
  } else if (repos.length < 1) {
    debug(`Installation ${installationId} has access to no repos`);
  } else {
    debug(
      `Installation ${installationId} has access to selected repos ` +
        `${JSON.stringify(repoNames)}`,
    );
  }

  appRegistry.registerInstallation({ installation, repos });
}
