import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../dispatch.js", () => ({
  dispatch: vi.fn().mockResolvedValue(undefined),
}));

import { dispatch } from "../dispatch.js";
import { timerTrigger } from "./index.js";

describe("Azure Function timer trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls dispatch with config from environment variables", async () => {
    vi.stubEnv("GITHUB_APP_ID", "12345");
    vi.stubEnv("GITHUB_APP_PK", "fake-key");
    vi.stubEnv("GITHUB_REPO", "owner/repo");
    vi.stubEnv("GITHUB_WORKFLOW", "provision-tokens.yml");

    await timerTrigger();

    expect(dispatch).toHaveBeenCalledWith({
      appId: "12345",
      privateKey: "fake-key",
      repo: "owner/repo",
      workflow: "provision-tokens.yml",
    });
  });

  it("throws when environment variables are missing", async () => {
    vi.stubEnv("GITHUB_APP_ID", "");
    vi.stubEnv("GITHUB_APP_PK", "");
    vi.stubEnv("GITHUB_REPO", "");
    vi.stubEnv("GITHUB_WORKFLOW", "");

    await expect(timerTrigger()).rejects.toThrow(
      "Missing required environment variables",
    );
  });

  it("propagates errors from dispatch", async () => {
    vi.stubEnv("GITHUB_APP_ID", "12345");
    vi.stubEnv("GITHUB_APP_PK", "fake-key");
    vi.stubEnv("GITHUB_REPO", "owner/repo");
    vi.stubEnv("GITHUB_WORKFLOW", "provision-tokens.yml");
    vi.mocked(dispatch).mockRejectedValue(new Error("dispatch failed"));

    await expect(timerTrigger()).rejects.toThrow("dispatch failed");
  });
});
