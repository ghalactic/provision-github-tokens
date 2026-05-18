import { App } from "octokit";

export interface DispatchConfig {
  appId: string;
  privateKey: string;
  repo: string;
  workflow: string;
}

export async function dispatch(config: DispatchConfig): Promise<void> {
  const { appId, privateKey, repo, workflow } = config;
  const [owner, repoName] = splitRepo(repo);
  const app = new App({ appId, privateKey });

  let installationId: number;

  try {
    const { data } = await app.octokit.request(
      "GET /repos/{owner}/{repo}/installation",
      {
        owner,
        repo: repoName,
      },
    );

    installationId = data.id;
  } catch (error: unknown) {
    if (hasStatus(error, 404)) {
      throw new Error(`GitHub App ${appId} is not installed on ${repo}`, {
        cause: error,
      });
    }

    throw error;
  }

  const octokit = await app.getInstallationOctokit(installationId);

  await octokit.request(
    "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
    {
      owner,
      repo: repoName,
      workflow_id: workflow,
      ref: "main",
    },
  );
}

function splitRepo(repo: string): [owner: string, repo: string] {
  const [owner, repoName] = repo.split("/");

  return [owner, repoName];
}

function hasStatus(
  error: unknown,
  status: number,
): error is { status: number } & Error {
  return error instanceof Error && "status" in error && error.status === status;
}
