import { beforeEach, expect, it, vi } from "vitest";

vi.mock("../dispatch.js", () => ({
  dispatch: vi.fn().mockResolvedValue(undefined),
}));

import { dispatch } from "../dispatch.js";
import worker, { type Env } from "./index.js";

const env: Env = {
  GITHUB_APP_ID: "12345",
  GITHUB_APP_PK:
    "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----",
  GITHUB_REPO: "owner/repo",
  GITHUB_WORKFLOW: "provision-tokens.yml",
};

const event = { cron: "*/30 * * * *", scheduledTime: Date.now() };

beforeEach(() => {
  vi.clearAllMocks();
});

it("calls dispatch with config from env bindings", async () => {
  await worker.scheduled(event, env);

  expect(dispatch).toHaveBeenCalledWith({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PK,
    repo: env.GITHUB_REPO,
    workflow: env.GITHUB_WORKFLOW,
  });
});

it("propagates errors from dispatch", async () => {
  vi.mocked(dispatch).mockRejectedValue(new Error("dispatch failed"));

  await expect(worker.scheduled(event, env)).rejects.toThrow("dispatch failed");
});
