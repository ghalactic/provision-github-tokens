import { debug, info } from "@actions/core";
import type { AppRegistry } from "./app-registry.js";
import { createAppOctokit, createInstallationOctokit } from "./octokit.js";
import { pluralize } from "./pluralize.js";
import type { AppInput } from "./type/input.js";

export async function discoverApps(
  registry: AppRegistry,
  appsInput: AppInput[],
): Promise<void> {
  for (const appInput of appsInput) {
    const appOctokit = createAppOctokit(appInput);
    const { data: app } = await appOctokit.rest.apps.getAuthenticated();

    /* v8 ignore start */
    if (!app) {
      throw new Error(
        `Invariant violation: App ${appInput.appId} can't access itself`,
      );
    }
    /* v8 ignore stop */

    debug(
      `Discovered app ${JSON.stringify(app.name)} (${app.slug} / ${app.id})`,
    );

    if (appInput.roles.length < 1) {
      debug(`App ${app.id} has no roles`);
    } else {
      debug(`App ${app.id} has roles ${JSON.stringify(appInput.roles)}`);
    }

    registry.registerApp(appInput.roles, app);
    const installationPages = appOctokit.paginate.iterator(
      appOctokit.rest.apps.listInstallations,
    );
    let installationCount = 0;

    for await (const { data: installations } of installationPages) {
      for (const installation of installations) {
        const {
          account,
          id: installationId,
          repository_selection,
          permissions,
        } = installation;

        /* v8 ignore start - never seen without an account */
        const accountDescription = account
          ? `account ${account.login}`
          : "unknown account";
        /* v8 ignore stop */

        debug(
          `Discovered app installation ${installationId} for ` +
            `${accountDescription}`,
        );

        ++installationCount;
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

          continue;
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
    }

    info(
      `Discovered ` +
        `${pluralize(installationCount, "installation", "installations")} ` +
        `of ${JSON.stringify(app.name)}`,
    );
  }
}
