import type { RestEndpointMethodTypes } from "@octokit/action";
import { RequestError } from "@octokit/request-error";
import stringify from "fast-json-stable-stringify";
import type {
  Environment,
  Installation,
  Repo,
} from "../../src/type/github-api.js";
import type { TestApp } from "../../test/github-api.js";

let apps: TestApp[];
let installations: [installation: Installation, repos: Repo[]][];
let installationTokens: {
  installationId: number;
  repositories: "all" | string[];
  permissions: Record<string, string>;
}[];
let environments: Record<string, Environment[]>;
let files: Record<string, Record<string, string>>;
let errorsByEndpoint: Record<string, (Error | undefined)[]>;

export function __reset() {
  apps = [];
  installations = [];
  installationTokens = [];
  environments = {};
  files = {};
  errorsByEndpoint = {};
}

export function __setApps(newApps: TestApp[]) {
  apps = newApps;
}

export function __setInstallations(
  newInstallations: [installation: Installation, repos: Repo[]][],
) {
  installations = newInstallations;
}

export function __addInstallationToken(
  installationId: number,
  repositories: "all" | string[],
  permissions: Record<string, string>,
) {
  installationTokens.push({ installationId, repositories, permissions });
}

export function __setEnvironments(
  newEnvironments: [repo: Repo, environments: Environment[]][],
) {
  environments = {};
  for (const [repo, envs] of newEnvironments) {
    environments[repo.full_name] = envs;
  }
}

export function __setFiles(
  newFiles: [repo: Repo, files: Record<string, string>][],
) {
  files = {};
  for (const [repo, f] of newFiles) files[repo.full_name] = f;
}

export function __setErrors(endpoint: string, errors: (Error | undefined)[]) {
  errorsByEndpoint[endpoint] = errors;
}

export function Octokit({
  auth: { appId, privateKey, installationId } = {},
}: {
  auth?: { appId?: number; privateKey?: string; installationId?: number };
} = {}) {
  return {
    paginate: {
      iterator: (endpoint: string) => {
        if (appId == null) {
          throw new Error(`Endpoint ${endpoint} requires appId`);
        }

        if (endpoint === "apps.listInstallations") {
          return listInstallations(appId);
        }

        if (installationId == null) {
          throw new Error(`Endpoint ${endpoint} requires installationId`);
        }

        if (endpoint === "apps.listReposAccessibleToInstallation") {
          return listReposAccessibleToInstallation(appId, installationId);
        }

        if (endpoint === "repos.getAllEnvironments") {
          return getAllEnvironments(appId, installationId);
        }

        throw new Error("Not implemented");
      },
    },

    rest: {
      apps: {
        createInstallationAccessToken: async ({
          installation_id,
          repositories,
          permissions,
        }: RestEndpointMethodTypes["apps"]["createInstallationAccessToken"]["parameters"]) => {
          throwIfEndpointError("apps.createInstallationAccessToken");

          if (appId == null) {
            throw new Error(
              "Endpoint apps.createInstallationAccessToken requires appId",
            );
          }

          const requestedPermissions = stringify(permissions);
          const requestedRepos = repositories
            ? stringify(repositories.toSorted())
            : "all";

          for (const [installation, repos] of installations) {
            if (installation.app_id !== appId) continue;
            if (installation.id !== installation_id) continue;

            const registeredRepos = repos.map((r) => r.full_name);

            for (const token of installationTokens) {
              if (token.installationId !== installation_id) continue;

              const tokenPermissions = stringify(token.permissions);
              if (tokenPermissions !== requestedPermissions) continue;

              if (repositories == null) {
                if (token.repositories !== "all") continue;
              } else {
                if (token.repositories === "all") continue;

                const tokenRepos = stringify(token.repositories.toSorted());
                if (requestedRepos !== tokenRepos) continue;

                if (!repositories.every((r) => registeredRepos.includes(r))) {
                  continue;
                }
              }

              return {
                data:
                  `<token ${installation_id}` +
                  `.${requestedRepos}` +
                  `.${requestedPermissions}>`,
              };
            }
          }

          throw new TestRequestError(401);
        },

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
        getAllEnvironments: "repos.getAllEnvironments",

        getContent: async ({
          owner,
          repo,
          path,
          mediaType,
        }: RestEndpointMethodTypes["repos"]["getContent"]["parameters"]) => {
          throwIfEndpointError("repos.getContent");

          if (mediaType?.format !== "raw") throw new TestRequestError(406);

          for (const [installation, repos] of installations) {
            if (appId != null && installation.app_id !== appId) {
              continue;
            }
            if (installationId != null && installation.id !== installationId) {
              continue;
            }

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

async function* getAllEnvironments(appId: number, installationId: number) {
  throwIfEndpointError("repos.getAllEnvironments");

  const per_page = 2;
  let page = [];

  for (const [installation, repos] of installations) {
    if (installation.app_id !== appId) continue;
    if (installation.id !== installationId) continue;

    for (const r of repos) {
      const envs = environments[r.full_name] ?? [];

      for (const env of envs) {
        page.push(env);

        if (page.length >= per_page) {
          yield { data: page };
          page = [];
        }
      }
    }
  }

  yield { data: page };
}

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
