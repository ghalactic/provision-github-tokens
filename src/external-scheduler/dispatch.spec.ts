import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    appRequest: vi.fn(),
    installationRequest: vi.fn(),
    getInstallationOctokit: vi.fn(),
    App: vi.fn(),
  };
});

vi.mock("octokit", () => {
  return {
    App: mocks.App,
  };
});

import { App } from "octokit";
import { dispatch, type DispatchConfig } from "./dispatch.js";

const config: DispatchConfig = {
  appId: "12345",
  privateKey:
    "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----",
  repo: "owner/repo",
  workflow: "provision-tokens.yml",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.appRequest.mockResolvedValue({ data: { id: 99 } });
  mocks.installationRequest.mockResolvedValue(undefined);
  mocks.getInstallationOctokit.mockResolvedValue({
    request: mocks.installationRequest,
  });
  vi.mocked(App).mockImplementation(function mockApp() {
    return {
      octokit: {
        request: mocks.appRequest,
      },
      getInstallationOctokit: mocks.getInstallationOctokit,
    } as never;
  });
});

it("creates an App with the configured credentials", async () => {
  await dispatch(config);

  expect(App).toHaveBeenCalledWith({
    appId: config.appId,
    privateKey: config.privateKey,
  });
});

it("discovers the installation for the target repo", async () => {
  await dispatch(config);

  expect(mocks.appRequest).toHaveBeenCalledWith(
    "GET /repos/{owner}/{repo}/installation",
    {
      owner: "owner",
      repo: "repo",
    },
  );
});

it("gets an installation octokit for the discovered installation", async () => {
  await dispatch(config);

  expect(mocks.getInstallationOctokit).toHaveBeenCalledWith(99);
});

it("dispatches the workflow using the installation octokit", async () => {
  await dispatch(config);

  expect(mocks.installationRequest).toHaveBeenCalledWith(
    "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
    {
      owner: "owner",
      repo: "repo",
      workflow_id: config.workflow,
      ref: "main",
    },
  );
});

it("throws when the app is not installed on the repo", async () => {
  mocks.appRequest.mockRejectedValue(
    Object.assign(new Error("Not Found"), { status: 404 }),
  );

  await expect(dispatch(config)).rejects.toThrow(
    `GitHub App ${config.appId} is not installed on ${config.repo}`,
  );
});

it("rethrows other octokit errors", async () => {
  const error = Object.assign(new Error("Boom"), { status: 500 });
  mocks.appRequest.mockRejectedValue(error);

  await expect(dispatch(config)).rejects.toBe(error);
});
