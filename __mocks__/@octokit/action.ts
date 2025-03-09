import type { RestEndpointMethodTypes } from "@octokit/action";
import { RequestError } from "@octokit/request-error";
import type { TestApp } from "../../test/github-api.js";

let apps: TestApp[];
let installations: [installation: any, repos: any[]][];
let files: Record<string, Record<string, string>>;
let errorsByEndpoint: Record<string, (Error | undefined)[]> = {};

export function __reset() {
  apps = [];
  installations = [];
  files = {};
  errorsByEndpoint = {};
}

export function __setApps(newApps: TestApp[]) {
  apps = newApps;
}

export function __setInstallations(
  newInstallations: [installation: any, repos: any[]][],
) {
  installations = newInstallations;
}

export function __setFiles(
  newFiles: [repo: any, files: Record<string, string>][],
) {
  files = {};
  for (const [repo, f] of newFiles) files[repo.full_name] = f;
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

          for (const app of apps) {
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

      repos: {
        getContent: async ({
          owner,
          repo,
          path,
          headers,
        }: RestEndpointMethodTypes["repos"]["getContent"]["parameters"]) => {
          throwIfEndpointError("repos.getContent");

          if (headers?.accept !== "application/vnd.github.raw+json") {
            throw new TestRequestError(406);
          }

          for (const [installation, repos] of installations) {
            if (installation.app_id !== appId) continue;
            if (installation.id !== installationId) continue;

            for (const r of repos) {
              if (r.full_name !== `${owner}/${repo}`) continue;

              const file = files[r.full_name]?.[path];

              if (typeof file === "string") return { data: file };
              throw new TestRequestError(404);
            }
          }

          throw new TestRequestError(404);
        },
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

  for (const [installation] of installations) {
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

  for (const [installation, repos] of installations) {
    if (installation.app_id !== appId) continue;
    if (installation.id !== installationId) continue;

    for (const repo of repos) {
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
