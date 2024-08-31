let apps: any[];
let installations: any[];

export function __reset() {
  apps = [];
  installations = [];
}

export function __setApps(newApps: any[]) {
  apps = newApps;
}

export function __setInstallations(newInstallations: any[]) {
  installations = newInstallations;
}

export function Octokit({
  auth: { appId, installationId },
}: {
  auth: { appId: number; installationId?: number };
}) {
  return {
    paginate: {
      iterator: (endpoint: string) => {
        if (endpoint === "apps.listInstallations") {
          return listInstallations(appId);
        }

        if (installationId == null) {
          throw new Error(`Endpoint ${endpoint} requires installationId`);
        }

        if (endpoint === "apps.listReposAccessibleToInstallation") {
          return listReposAccessibleToInstallation(appId, installationId);
        }

        throw new Error("Not implemented");
      },
    },

    rest: {
      apps: {
        getAuthenticated: async () => {
          for (const [, app] of Object.entries(apps)) {
            if (app.id === appId) return { data: app };
          }

          // TODO: Simulate how Octokit would throw an error
          throw new Error(`App ${appId} not found`);
        },

        listInstallations: "apps.listInstallations",
        listReposAccessibleToInstallation:
          "apps.listReposAccessibleToInstallation",
      },
    },
  };
}

Object.defineProperty(Octokit, "plugin", {
  value: () => Octokit,
});

async function* listInstallations(appId: number) {
  const per_page = 2;
  let page = [];

  for (const [, installation] of Object.entries(installations)) {
    if (installation.app_id !== appId) continue;

    page.push(installation);

    if (page.length >= per_page) {
      yield { data: page };
      page = [];
    }
  }

  yield { data: page };
}

async function* listReposAccessibleToInstallation(
  appId: number,
  installationId: number,
) {
  const per_page = 2;
  let page = [];

  for (const [, installation] of Object.entries(installations)) {
    if (installation.app_id !== appId) continue;
    if (installation.id !== installationId) continue;

    for (const repo of installation.repositories) {
      page.push(repo);

      if (page.length >= per_page) {
        yield { data: page };
        page = [];
      }
    }
  }

  yield { data: page };
}
