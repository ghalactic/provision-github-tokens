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

  const {
    data: { default_branch: ref },
  } = await octokit.request("GET /repos/{owner}/{repo}", {
    owner,
    repo: repoName,
  });

  await octokit.request(
    "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
    {
      owner,
      repo: repoName,
      workflow_id: workflow,
      ref,
    },
  );
}

function splitRepo(repo: string): [owner: string, repo: string] {
  const parts = repo.split("/");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repo format: "${repo}". Expected "owner/repo".`);
  }

  return [parts[0], parts[1]];
}

function hasStatus(
  error: unknown,
  status: number,
): error is { status: number } & Error {
  return error instanceof Error && "status" in error && error.status === status;
}
