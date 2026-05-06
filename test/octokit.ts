import type { Endpoints } from "@octokit/types";
import { Octokit } from "octokit";

export type TestOctokit = InstanceType<typeof Octokit>;

export function createTestOctokit(): TestOctokit {
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

export function createTestOctokitWithToken(token: string): TestOctokit {
  return new Octokit({ auth: token });
}

export type Reference =
  Endpoints["GET /repos/{owner}/{repo}/git/ref/{ref}"]["response"]["data"];

export type WorkflowRun =
  Endpoints["GET /repos/{owner}/{repo}/actions/runs/{run_id}"]["response"]["data"];
