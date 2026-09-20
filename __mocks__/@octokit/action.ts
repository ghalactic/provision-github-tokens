/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/require-await */
import type { RestEndpointMethodTypes } from "@octokit/action";
import { RequestError } from "@octokit/request-error";
import stringify from "fast-json-stable-stringify";
import type {
  Environment,
  Installation,
  Issue,
  Repo,
} from "../../src/type/github-api.js";
import type { Permissions } from "../../src/type/permissions.js";
import {
  createTestInstallationToken,
  createTestIssue,
  type TestApp,
} from "../../test/github-api.js";
import { decrypt, type TestKeyPair } from "../../test/key.js";

let apps: TestApp[];
let installations: [installation: Installation, repos: Repo[]][];
let installationTokens: {
  installationId: number;
  repositories: "all" | string[];
  permissions: Record<string, string>;
}[];
let environments: Record<string, Environment[]>;
let files: Record<string, Record<string, string>>;
let orgKeys: Record<
  string,
  { actions?: TestKeyPair; codespaces?: TestKeyPair; dependabot?: TestKeyPair }
>;
let repoKeys: Record<
  string,
  {
    actions?: TestKeyPair;
    codespaces?: TestKeyPair;
    dependabot?: TestKeyPair;
    environments: Record<string, TestKeyPair>;
  }
>;
let repoIssueLabels: Record<string, string[]>;
let orgSecrets: Record<
  string,
  {
    actions: Record<string, string>;
    codespaces: Record<string, string>;
    dependabot: Record<string, string>;
  }
>;
let repoSecrets: Record<
  string,
  {
    actions: Record<string, string>;
    codespaces: Record<string, string>;
    dependabot: Record<string, string>;
  }
>;
let envSecrets: Record<string, Record<string, string>>;
let issues: Record<string, Issue[]>;
let issueComments: Record<string, string[]>;
let errorsByEndpoint: Record<string, (Error | undefined)[]>;

export function __reset() {
  apps = [];
  installations = [];
  installationTokens = [];
  environments = {};
  files = {};
  orgKeys = {};
  repoKeys = {};
  repoIssueLabels = {};
  orgSecrets = {};
  repoSecrets = {};
  envSecrets = {};
  issues = {};
  issueComments = {};
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

export function __setOrgKeys(
  org: string,
  keys: {
    actions?: TestKeyPair;
    codespaces?: TestKeyPair;
    dependabot?: TestKeyPair;
  },
) {
  orgKeys[org] = keys;
}

export function __setRepoKeys(
  owner: string,
  repo: string,
  {
    actions,
    codespaces,
    dependabot,
    environments = {},
  }: {
    actions?: TestKeyPair;
    codespaces?: TestKeyPair;
    dependabot?: TestKeyPair;
    environments?: Record<string, TestKeyPair>;
  },
) {
  repoKeys[`${owner}/${repo}`] = {
    actions,
    codespaces,
    dependabot,
    environments,
  };
}

export function __setErrors(endpoint: string, errors: (Error | undefined)[]) {
  errorsByEndpoint[endpoint] = errors;
}

export function __getOrgSecrets(org: string) {
  return orgSecrets[org];
}

export function __getRepoSecrets(owner: string, repo: string) {
  return repoSecrets[`${owner}/${repo}`];
}

export function __getEnvSecrets(owner: string, repo: string, env: string) {
  return envSecrets[`${owner}/${repo}/${env}`];
}

export function __setIssues(repo: string, newIssues: Issue[]) {
  issues[repo] = newIssues;
}

export function __getIssues(owner: string, repo: string) {
  return issues[`${owner}/${repo}`] ?? [];
}

export function __setRepoIssueLabels(repo: string, labels: string[]) {
  repoIssueLabels[repo] = labels;
}

export function __getRepoIssueLabels(repo: string) {
  return repoIssueLabels[repo] ?? [];
}

export function __getIssueComments(
  owner: string,
  repo: string,
  number: number,
) {
  return issueComments[`${owner}/${repo}/${number}`] ?? [];
}

export function Octokit({
  auth: { appId, privateKey, installationId } = {},
}: {
  auth?: { appId?: number; privateKey?: string; installationId?: number };
} = {}) {
  return {
    paginate: {
      iterator: (endpoint: string, params?: object) => {
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

        if (endpoint === "issues.listForRepo") {
          return listIssuesForRepo(
            appId,
            installationId,
            params as { owner: string; repo: string; state?: string },
          );
        }

        throw new Error("Not implemented");
      },
    },

    rest: {
      actions: {
        createOrUpdateEnvironmentSecret: async ({
          owner,
          repo,
          environment_name,
          secret_name,
          encrypted_value,
          key_id,
        }: RestEndpointMethodTypes["actions"]["createOrUpdateEnvironmentSecret"]["parameters"]) => {
          throwIfEndpointError("actions.createOrUpdateEnvironmentSecret");

          if (appId == null) {
            throw new Error(
              "Endpoint actions.createOrUpdateEnvironmentSecret requires appId",
            );
          }
          if (installationId == null) {
            throw new Error(
              "Endpoint actions.createOrUpdateEnvironmentSecret requires installationId",
            );
          }

          const repoName = `${owner}/${repo}`;
          const envName = `${repoName}/${environment_name}`;
          const key = repoKeys[repoName]?.environments?.[environment_name];

          if (!encrypted_value || !key || key.githubPublic.key_id !== key_id) {
            throw new TestRequestError(401);
          }

          try {
            const decrypted = await decrypt(key, encrypted_value);
            envSecrets[envName] ??= {};
            envSecrets[envName][secret_name] = decrypted;
          } catch {
            throw new TestRequestError(400);
          }
        },

        createOrUpdateOrgSecret: async (
          params: RestEndpointMethodTypes["actions"]["createOrUpdateOrgSecret"]["parameters"],
        ) => createOrUpdateOrgSecret("actions", params),

        createOrUpdateRepoSecret: async (
          params: RestEndpointMethodTypes["actions"]["createOrUpdateRepoSecret"]["parameters"],
        ) => createOrUpdateRepoSecret("actions", params),

        getOrgPublicKey: async (
          params: RestEndpointMethodTypes["actions"]["getOrgPublicKey"]["parameters"],
        ) => getOrgPublicKey("actions", params),

        getRepoPublicKey: async (
          params: RestEndpointMethodTypes["actions"]["getRepoPublicKey"]["parameters"],
        ) => getRepoPublicKey("actions", params),

        getEnvironmentPublicKey: async ({
          owner,
          repo,
          environment_name,
        }: RestEndpointMethodTypes["actions"]["getEnvironmentPublicKey"]["parameters"]) => {
          throwIfEndpointError("actions.getEnvironmentPublicKey");

          if (appId == null) {
            throw new Error(
              "Endpoint actions.getEnvironmentPublicKey requires appId",
            );
          }
          if (installationId == null) {
            throw new Error(
              "Endpoint actions.getEnvironmentPublicKey requires installationId",
            );
          }

          const repoName = `${owner}/${repo}`;

          if (!repoKeys[repoName]?.environments?.[environment_name]) {
            throw new TestRequestError(401);
          }

          return {
            data: repoKeys[repoName].environments[environment_name]
              .githubPublic,
          };
        },
      },

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

            const registeredRepos = repos.map((r) => r.name);

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

              const key = JSON.stringify({
                installation_id,
                requestedRepos,
                requestedPermissions,
              });

              return createTestInstallationToken(
                key,
                token.repositories,
                token.permissions as Permissions,
              );
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

      codespaces: {
        createOrUpdateOrgSecret: async (
          params: RestEndpointMethodTypes["codespaces"]["createOrUpdateOrgSecret"]["parameters"],
        ) => createOrUpdateOrgSecret("codespaces", params),

        createOrUpdateRepoSecret: async (
          params: RestEndpointMethodTypes["codespaces"]["createOrUpdateRepoSecret"]["parameters"],
        ) => createOrUpdateRepoSecret("codespaces", params),

        getOrgPublicKey: async (
          params: RestEndpointMethodTypes["codespaces"]["getOrgPublicKey"]["parameters"],
        ) => getOrgPublicKey("codespaces", params),

        getRepoPublicKey: async (
          params: RestEndpointMethodTypes["codespaces"]["getRepoPublicKey"]["parameters"],
        ) => getRepoPublicKey("codespaces", params),
      },

      dependabot: {
        createOrUpdateOrgSecret: async (
          params: RestEndpointMethodTypes["dependabot"]["createOrUpdateOrgSecret"]["parameters"],
        ) => createOrUpdateOrgSecret("dependabot", params),

        createOrUpdateRepoSecret: async (
          params: RestEndpointMethodTypes["dependabot"]["createOrUpdateRepoSecret"]["parameters"],
        ) => createOrUpdateRepoSecret("dependabot", params),

        getOrgPublicKey: async (
          params: RestEndpointMethodTypes["dependabot"]["getOrgPublicKey"]["parameters"],
        ) => getOrgPublicKey("dependabot", params),

        getRepoPublicKey: async (
          params: RestEndpointMethodTypes["dependabot"]["getRepoPublicKey"]["parameters"],
        ) => getRepoPublicKey("dependabot", params),
      },

      issues: {
        create: async ({
          owner,
          repo,
          title,
          body,
          labels = [],
        }: RestEndpointMethodTypes["issues"]["create"]["parameters"]) => {
          throwIfEndpointError("issues.create");

          if (appId == null) {
            throw new Error("Endpoint issues.create requires appId");
          }
          if (installationId == null) {
            throw new Error("Endpoint issues.create requires installationId");
          }

          const repoName = `${owner}/${repo}`;
          const repoIssues = issues[repoName] ?? (issues[repoName] = []);

          const issue = createTestIssue(
            owner,
            repo,
            repoIssues.length + 1,
            "open",
            String(title),
            body ?? null,
            labels as string[],
          );

          repoIssues.push(issue);

          return { data: issue };
        },

        createComment: async ({
          owner,
          repo,
          issue_number,
          body,
        }: RestEndpointMethodTypes["issues"]["createComment"]["parameters"]) => {
          throwIfEndpointError("issues.createComment");

          if (appId == null) {
            throw new Error("Endpoint issues.createComment requires appId");
          }
          if (installationId == null) {
            throw new Error(
              "Endpoint issues.createComment requires installationId",
            );
          }

          const key = `${owner}/${repo}/${issue_number}`;
          const comments = issueComments[key] ?? (issueComments[key] = []);
          comments.push(body);

          return { data: { body } };
        },

        createLabel: async ({
          owner,
          repo,
          name,
        }: RestEndpointMethodTypes["issues"]["createLabel"]["parameters"]) => {
          throwIfEndpointError("issues.createLabel");

          if (appId == null) {
            throw new Error("Endpoint issues.createLabel requires appId");
          }
          if (installationId == null) {
            throw new Error(
              "Endpoint issues.createLabel requires installationId",
            );
          }

          const repoName = `${owner}/${repo}`;
          const repoLabels =
            repoIssueLabels[repoName] ?? (repoIssueLabels[repoName] = []);

          if (repoLabels.includes(name)) {
            throw new TestRequestError(422, {
              errors: [
                { resource: "Label", code: "already_exists", field: "name" },
              ],
            });
          }

          repoLabels.push(name);

          return { data: { name } };
        },

        listForRepo: "issues.listForRepo",

        update: async ({
          owner,
          repo,
          issue_number,
          title,
          body,
          state,
          labels = [],
        }: RestEndpointMethodTypes["issues"]["update"]["parameters"]) => {
          throwIfEndpointError("issues.update");

          if (appId == null) {
            throw new Error("Endpoint issues.update requires appId");
          }
          if (installationId == null) {
            throw new Error("Endpoint issues.update requires installationId");
          }

          const repoIssues = issues[`${owner}/${repo}`] ?? [];
          const issue = repoIssues.find((i) => i.number === issue_number);

          if (!issue) throw new TestRequestError(404);

          if (typeof title === "string") issue.title = title;
          if (typeof body === "string") issue.body = body;
          if (typeof state === "string") issue.state = state;
          if (labels) issue.labels = labels;

          return { data: issue };
        },
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

  async function createOrUpdateOrgSecret(
    secretType: "actions" | "codespaces" | "dependabot",
    {
      org,
      secret_name,
      encrypted_value,
      key_id,
      visibility,
    }: {
      org: string;
      secret_name: string;
      encrypted_value?: string;
      key_id?: string;
      visibility: "all" | "private" | "selected";
      selected_repository_ids?: (string | number)[];
    },
  ) {
    const endpoint = `${secretType}.createOrUpdateOrgSecret`;
    throwIfEndpointError(endpoint);

    if (appId == null) {
      throw new Error(`Endpoint ${endpoint} requires appId`);
    }
    if (installationId == null) {
      throw new Error(`Endpoint ${endpoint} requires installationId`);
    }

    const key = orgKeys[org]?.[secretType];

    if (visibility !== "all") throw new TestRequestError(400);
    if (!encrypted_value || !key || key.githubPublic.key_id !== key_id) {
      throw new TestRequestError(401);
    }

    try {
      const decrypted = await decrypt(key, encrypted_value);
      orgSecrets[org] ??= { actions: {}, codespaces: {}, dependabot: {} };
      orgSecrets[org][secretType][secret_name] = decrypted;
    } catch {
      throw new TestRequestError(400);
    }
  }

  async function createOrUpdateRepoSecret(
    secretType: "actions" | "codespaces" | "dependabot",
    {
      owner,
      repo,
      secret_name,
      encrypted_value,
      key_id,
    }: {
      owner: string;
      repo: string;
      secret_name: string;
      encrypted_value?: string;
      key_id?: string;
    },
  ) {
    const endpoint = `${secretType}.createOrUpdateRepoSecret`;
    throwIfEndpointError(endpoint);

    if (appId == null) {
      throw new Error(`Endpoint ${endpoint} requires appId`);
    }
    if (installationId == null) {
      throw new Error(`Endpoint ${endpoint} requires installationId`);
    }

    const repoName = `${owner}/${repo}`;
    const key = repoKeys[repoName]?.[secretType];

    if (!encrypted_value || !key || key.githubPublic.key_id !== key_id) {
      throw new TestRequestError(401);
    }

    try {
      const decrypted = await decrypt(key, encrypted_value);
      repoSecrets[repoName] ??= { actions: {}, codespaces: {}, dependabot: {} };
      repoSecrets[repoName][secretType][secret_name] = decrypted;
    } catch {
      throw new TestRequestError(400);
    }
  }

  async function getOrgPublicKey(
    secretType: "actions" | "codespaces" | "dependabot",
    { org }: { org: string },
  ) {
    const endpoint = `${secretType}.getOrgPublicKey`;
    throwIfEndpointError(endpoint);

    if (appId == null) {
      throw new Error(`Endpoint ${endpoint} requires appId`);
    }
    if (installationId == null) {
      throw new Error(`Endpoint ${endpoint} requires installationId`);
    }

    if (!orgKeys[org]?.[secretType]) throw new TestRequestError(401);

    return { data: orgKeys[org][secretType].githubPublic };
  }

  async function getRepoPublicKey(
    secretType: "actions" | "codespaces" | "dependabot",
    { owner, repo }: { owner: string; repo: string },
  ) {
    const endpoint = `${secretType}.getRepoPublicKey`;
    throwIfEndpointError(endpoint);

    if (appId == null) {
      throw new Error(`Endpoint ${endpoint} requires appId`);
    }
    if (installationId == null) {
      throw new Error(`Endpoint ${endpoint} requires installationId`);
    }

    const repoName = `${owner}/${repo}`;

    if (!repoKeys[repoName]?.[secretType]) throw new TestRequestError(401);

    return { data: repoKeys[repoName][secretType].githubPublic };
  }
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

async function* listIssuesForRepo(
  appId: number,
  installationId: number,
  options: { owner: string; repo: string; state?: string },
) {
  throwIfEndpointError("issues.listForRepo");

  const per_page = 2;
  let page = [];

  for (const [installation, repos] of installations) {
    if (installation.app_id !== appId) continue;
    if (installation.id !== installationId) continue;

    for (const r of repos) {
      if (options.owner != null && r.owner.login !== options.owner) continue;
      if (options.repo != null && r.name !== options.repo) continue;

      for (const issue of issues[r.full_name] ?? []) {
        if (options.state != null && issue.state !== options.state) continue;

        page.push(issue);

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

const HTTP_STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  406: "Not Acceptable",
  422: "Unprocessable Entity",
  500: "Internal Server Error",
};

export class TestRequestError extends RequestError {
  constructor(status: number, body?: unknown) {
    super(HTTP_STATUS_TEXT[status] ?? `HTTP ${status}`, status, {
      request: { method: "GET", url: "https://api.org/", headers: {} },
      ...(typeof body !== "undefined" && {
        response: {
          url: "https://api.org/",
          status,
          headers: {},
          data: body,
        },
      }),
    });
  }
}
