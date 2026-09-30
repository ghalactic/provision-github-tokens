/*
 * TODO: Delete this module once Octokit exposes an `agents` REST namespace.
 */
import type { Endpoints } from "@octokit/types";
import type { Octokit } from "./octokit.js";
import type { PublicKey } from "./type/github-api.js";

export type AgentsOctokit = {
  getOrgPublicKey: (
    parameters: Endpoints["GET /orgs/{org}/agents/secrets/public-key"]["parameters"],
  ) => Promise<{ data: PublicKey }>;
  getRepoPublicKey: (
    parameters: Endpoints["GET /repos/{owner}/{repo}/agents/secrets/public-key"]["parameters"],
  ) => Promise<{ data: PublicKey }>;
  createOrUpdateOrgSecret: (
    parameters: Endpoints["PUT /orgs/{org}/agents/secrets/{secret_name}"]["parameters"],
  ) => Promise<void>;
  createOrUpdateRepoSecret: (
    parameters: Endpoints["PUT /repos/{owner}/{repo}/agents/secrets/{secret_name}"]["parameters"],
  ) => Promise<void>;
};

export function createAgentsOctokit(octokit: Octokit): AgentsOctokit {
  return {
    getOrgPublicKey: async (parameters) =>
      await octokit.request(
        "GET /orgs/{org}/agents/secrets/public-key",
        parameters,
      ),

    getRepoPublicKey: async (parameters) =>
      await octokit.request(
        "GET /repos/{owner}/{repo}/agents/secrets/public-key",
        parameters,
      ),

    createOrUpdateOrgSecret: async (parameters) => {
      await octokit.request(
        "PUT /orgs/{org}/agents/secrets/{secret_name}",
        parameters,
      );
    },

    createOrUpdateRepoSecret: async (parameters) => {
      await octokit.request(
        "PUT /repos/{owner}/{repo}/agents/secrets/{secret_name}",
        parameters,
      );
    },
  };
}
