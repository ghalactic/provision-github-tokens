import { Octokit } from "@octokit/action";
import { retry } from "@octokit/plugin-retry";
import type { Endpoints } from "@octokit/types";

const CustomOctokit = Octokit.plugin(retry);

export type TestOctokit = InstanceType<typeof CustomOctokit>;

export function createTestOctokit(): TestOctokit {
  return new CustomOctokit();
}

export type Reference =
  Endpoints["GET /repos/{owner}/{repo}/git/ref/{ref}"]["response"]["data"];

export type WorkflowRun =
  Endpoints["GET /repos/{owner}/{repo}/actions/runs/{run_id}"]["response"]["data"];
