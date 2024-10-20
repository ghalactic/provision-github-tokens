import { debug, info, error as logError } from "@actions/core";
import type { AppRegistry } from "./app-registry.js";
import { errorStack } from "./error.js";
import {
  handleRequestError,
  type Octokit,
  type OctokitFactory,
} from "./octokit.js";
import { pluralize } from "./pluralize.js";
import type { App, Installation, InstallationRepo } from "./type/github-api.js";
import type { AppInput } from "./type/input.js";

export async function discoverApps(
  octokitFactory: OctokitFactory,
  registry: AppRegistry,
  appsInput: AppInput[],
): Promise<void> {
  let appIndex = 0;

  for (const appInput of appsInput) {
    try {
      await discoverApp(octokitFactory, registry, appInput, appIndex++);
    } catch (error) {
      debug(`Failed to discover app ${appInput.appId}`);
      logError(
        new Error(
          `Failed to discover app at index ${appIndex}: ${errorStack(error)}`,
          { cause: error },
        ),
      );
    }
  }
}

async function discoverApp(
  octokitFactory: OctokitFactory,
  registry: AppRegistry,
  appInput: AppInput,
  appIndex: number,
): Promise<void> {
  const appOctokit = octokitFactory.appOctokit(appInput);
  let app: App | null;

  try {
    ({ data: app } = await appOctokit.rest.apps.getAuthenticated());
  } catch (error) {
    handleRequestError(error, {
      401: () => {
        debug(`App ${appInput.appId} has incorrect credentials - skipping`);
        info(`App at index ${appIndex} has incorrect credentials - skipping`);
      },
      404: () => {
        debug(`App ${appInput.appId} not found - skipping`);
        info(`App at index ${appIndex} not found - skipping`);
      },
    });

    return;
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

  if (appInput.roles.length < 1) {
    debug(`App ${app.id} has no roles`);
  } else {
    debug(`App ${app.id} has roles ${JSON.stringify(appInput.roles)}`);
  }

  registry.registerApp(appInput.roles, app);
  await discoverInstallations(
    octokitFactory,
    registry,
    appInput,
    appOctokit,
    app,
    appIndex,
  );
}

async function discoverInstallations(
  octokitFactory: OctokitFactory,
  registry: AppRegistry,
  appInput: AppInput,
  appOctokit: Octokit,
  app: App,
  appIndex: number,
): Promise<void> {
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
          registry,
          appInput,
          installation,
        );
        ++successCount;
      } catch (error) {
        ++failureCount;
        debug(`Failed to discover installation for app at index ${appIndex}`);
        logError(
          new Error(
            `Failed to discover installation ${installation.id} for app ` +
              `${app.id}: ${errorStack(error)}`,
            { cause: error },
          ),
        );
      }
    }
  }

  const rolesSuffix =
    appInput.roles.length < 1
      ? ""
      : ` with ${pluralize(appInput.roles.length, "role", "roles")} ` +
        `${appInput.roles.map((r) => JSON.stringify(r)).join(", ")}`;

  info(
    `Discovered ${successCount} ` +
      `${pluralize(successCount, "installation", "installations")} ` +
      `of ${JSON.stringify(app.name)}${rolesSuffix}`,
  );

  if (failureCount > 0) {
    info(
      `Failed to discover ${failureCount} ` +
        `${pluralize(failureCount, "installation", "installations")} ` +
        `of ${JSON.stringify(app.name)}${rolesSuffix}`,
    );
  }
}

async function discoverInstallation(
  octokitFactory: OctokitFactory,
  registry: AppRegistry,
  appInput: AppInput,
  installation: Installation,
): Promise<void> {
  const {
    account,
    id: installationId,
    repository_selection,
    permissions,
  } = installation;

  const repos: InstallationRepo[] = [];

  if (repository_selection === "selected") {
    const installationOctokit = octokitFactory.installationOctokit(
      appInput,
      installationId,
    );

    const repoPages = installationOctokit.paginate.iterator(
      installationOctokit.rest.apps.listReposAccessibleToInstallation,
    );

    for await (const { data } of repoPages) {
      // Octokit type is broken, this is correct
      const repositories = data as unknown as (typeof data)["repositories"];

      for (const repo of repositories) repos.push(repo);
    }
  }

  /* v8 ignore start - never seen without an account login */
  const accountDescription =
    account && "login" in account
      ? `account ${account.login}`
      : "unknown account";
  /* v8 ignore stop */

  debug(
    `Discovered app installation ${installationId} for ` +
      `${accountDescription}`,
  );

  if (Object.keys(permissions).length < 1) {
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
        `in ${accountDescription}`,
    );
  } else if (repos.length < 1) {
    debug(`Installation ${installationId} has access to no repos`);
  } else {
    const repoNames = repos.map(({ full_name }) => full_name);
    debug(
      `Installation ${installationId} has access to repos ` +
        `${JSON.stringify(repoNames)}`,
    );
  }

  registry.registerInstallation(installation);
  registry.registerInstallationRepos(installationId, repos);
}
