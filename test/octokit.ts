import type { Endpoints } from "@octokit/types";
import { Octokit } from "octokit";

export type TestOctokit = InstanceType<typeof Octokit>;

export function createTestOctokit(
  auth: string | undefined = process.env.GITHUB_TOKEN,
): TestOctokit {
  return new Octokit({ auth });
}

export type Reference =
  Endpoints["GET /repos/{owner}/{repo}/git/ref/{ref}"]["response"]["data"];

export type WorkflowRun =
  Endpoints["GET /repos/{owner}/{repo}/actions/runs/{run_id}"]["response"]["data"];
