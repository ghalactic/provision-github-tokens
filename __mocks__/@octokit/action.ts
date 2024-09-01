import { RequestError } from "@octokit/request-error";

let apps: any[];
let installations: any[];
let errorsByEndpoint: Record<string, (Error | undefined)[]> = {};

export function __reset() {
  apps = [];
  installations = [];
  errorsByEndpoint = {};
}

export function __setApps(newApps: any[]) {
  apps = newApps;
}

export function __setInstallations(newInstallations: any[]) {
  installations = newInstallations;
}

export function __setErrors(endpoint: string, errors: (Error | undefined)[]) {
  errorsByEndpoint[endpoint] = errors;
}

export function Octokit({
  auth: { appId, privateKey, installationId },
}: {
  auth: { appId: number; privateKey: string; installationId?: number };
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
          throwIfEndpointError("apps.getAuthenticated");

          for (const [, app] of Object.entries(apps)) {
            if (app.id === appId) {
              if (privateKey !== app.privateKey) {
                throw new TestRequestError(401);
              }

              return { data: app };
            }
          }

          throw new TestRequestError(404);
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
  throwIfEndpointError("apps.listInstallations");

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
  throwIfEndpointError("apps.listReposAccessibleToInstallation");

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

function throwIfEndpointError(endpoint: string) {
  const errors = errorsByEndpoint[endpoint] ?? [];
  const error = errors.shift();
  errorsByEndpoint[endpoint] = errors;

  if (error) throw error;
}

class TestRequestError extends RequestError {
  constructor(status: number) {
    super("", status, {
      request: { method: "GET", url: "https://api.org/", headers: {} },
    });
  }
}
