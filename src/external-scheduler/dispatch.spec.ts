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
  mocks.installationRequest.mockImplementation((route: string) => {
    if (route === "GET /repos/{owner}/{repo}") {
      return Promise.resolve({ data: { default_branch: "main" } });
    }

    return Promise.resolve(undefined);
  });
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

it("resolves the default branch via the API", async () => {
  await dispatch(config);

  expect(mocks.installationRequest).toHaveBeenCalledWith(
    "GET /repos/{owner}/{repo}",
    {
      owner: "owner",
      repo: "repo",
    },
  );
});

it("dispatches the workflow using the resolved default branch", async () => {
  mocks.installationRequest.mockImplementation((route: string) => {
    if (route === "GET /repos/{owner}/{repo}") {
      return Promise.resolve({ data: { default_branch: "develop" } });
    }

    return Promise.resolve(undefined);
  });

  await dispatch(config);

  expect(mocks.installationRequest).toHaveBeenCalledWith(
    "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
    {
      owner: "owner",
      repo: "repo",
      workflow_id: config.workflow,
      ref: "develop",
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

it("throws on invalid repo format with no slash", async () => {
  await expect(dispatch({ ...config, repo: "noslash" })).rejects.toThrow(
    'Invalid repo format: "noslash". Expected "owner/repo".',
  );
});

it("throws on invalid repo format with empty owner", async () => {
  await expect(dispatch({ ...config, repo: "/repo" })).rejects.toThrow(
    'Invalid repo format: "/repo". Expected "owner/repo".',
  );
});

it("throws on invalid repo format with extra segments", async () => {
  await expect(dispatch({ ...config, repo: "a/b/c" })).rejects.toThrow(
    'Invalid repo format: "a/b/c". Expected "owner/repo".',
  );
});
