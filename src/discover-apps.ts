import { debug, info } from "@actions/core";
import type { AppRegistry } from "./app-registry.js";
import {
  createAppOctokit,
  createInstallationOctokit,
  handleRequestError,
  type Octokit,
} from "./octokit.js";
import { pluralize } from "./pluralize.js";
import type { App, Installation } from "./type/github-api.js";
import type { AppInput } from "./type/input.js";

export async function discoverApps(
  registry: AppRegistry,
  appsInput: AppInput[],
): Promise<void> {
  let appIndex = 0;

  for (const appInput of appsInput) {
    await discoverApp(registry, appInput, appIndex++);
  }
}

async function discoverApp(
  registry: AppRegistry,
  appInput: AppInput,
  appIndex: number,
): Promise<void> {
  const appOctokit = createAppOctokit(appInput);
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
  await discoverInstallations(registry, appInput, appOctokit, app);
}

async function discoverInstallations(
  registry: AppRegistry,
  appInput: AppInput,
  appOctokit: Octokit,
  app: App,
): Promise<void> {
  const installationPages = appOctokit.paginate.iterator(
    appOctokit.rest.apps.listInstallations,
  );
  let installationCount = 0;

  for await (const { data: installations } of installationPages) {
    installationCount += installations.length;

    for (const installation of installations) {
      await discoverInstallation(registry, appInput, installation);
    }
  }

  const rolesSuffix =
    appInput.roles.length < 1
      ? ""
      : ` with ${pluralize(appInput.roles.length, "role", "roles")} ` +
        `${appInput.roles.map((r) => JSON.stringify(r)).join(", ")}`;

  info(
    `Discovered ${installationCount} ` +
      `${pluralize(installationCount, "installation", "installations")} ` +
      `of ${JSON.stringify(app.name)}${rolesSuffix}`,
  );
}

async function discoverInstallation(
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

  registry.registerInstallation(installation);

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
      `Installation ${installationId} has access to all repositories ` +
        `in ${accountDescription}`,
    );

    registry.registerInstallationRepositories(installationId, []);

    return;
  }

  const installationOctokit = createInstallationOctokit(
    appInput,
    installationId,
  );

  const repositoryPages = installationOctokit.paginate.iterator(
    installationOctokit.rest.apps.listReposAccessibleToInstallation,
  );
  const repos = [];

  for await (const { data } of repositoryPages) {
    // Octokit type is broken, this is correct
    const repositories = data as unknown as (typeof data)["repositories"];

    for (const repository of repositories) repos.push(repository);
  }

  if (repos.length < 1) {
    debug(`Installation ${installationId} has access to no repositories`);
  } else {
    const repoNames = repos.map(({ full_name }) => full_name);
    debug(
      `Installation ${installationId} has access to repositories ` +
        `${JSON.stringify(repoNames)}`,
    );
  }

  registry.registerInstallationRepositories(installationId, repos);
}
