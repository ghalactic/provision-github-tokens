import { Octokit } from "@octokit/action";
import { retry } from "@octokit/plugin-retry";
import type { Endpoints } from "@octokit/types";

export function createTestOctokit() {
  const CustomOctokit = Octokit.plugin(retry);

  return new CustomOctokit();
}

export type TestOctokit = ReturnType<typeof createTestOctokit>;

export type Reference =
  Endpoints["GET /repos/{owner}/{repo}/git/ref/{ref}"]["response"]["data"];

export type WorkflowRun =
  Endpoints["GET /repos/{owner}/{repo}/actions/runs/{run_id}"]["response"]["data"];
