import { beforeEach, expect, it, vi } from "vitest";

vi.mock("../dispatch.js", () => ({
  dispatch: vi.fn().mockResolvedValue(undefined),
}));

const mockTimer = vi.hoisted(() => vi.fn());

vi.mock("@azure/functions", () => ({
  app: { timer: mockTimer },
}));

import { dispatch } from "../dispatch.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("GITHUB_APP_ID", "12345");
  vi.stubEnv("GITHUB_APP_PK", "fake-key");
  vi.stubEnv("GITHUB_REPO", "owner/repo");
  vi.stubEnv("GITHUB_WORKFLOW", "provision-tokens.yml");
  vi.resetModules();
});

function getHandler(): () => Promise<void> {
  const options = mockTimer.mock.calls[0][1] as { handler: () => Promise<void> };

  return options.handler;
}

it("registers a timer trigger with 30-minute schedule", async () => {
  await import("./index.js");

  expect(mockTimer).toHaveBeenCalledWith(
    "schedulerTimer",
    expect.objectContaining({ schedule: "0 */30 * * * *" }),
  );
});

it("calls dispatch with config from environment variables", async () => {
  await import("./index.js");
  const handler = getHandler();

  await handler();

  expect(dispatch).toHaveBeenCalledWith({
    appId: "12345",
    privateKey: "fake-key",
    repo: "owner/repo",
    workflow: "provision-tokens.yml",
  });
});

it("throws when environment variables are missing", async () => {
  vi.stubEnv("GITHUB_APP_ID", "");
  await import("./index.js");
  const handler = getHandler();

  await expect(handler()).rejects.toThrow(
    "Missing required environment variables",
  );
});

it("propagates errors from dispatch", async () => {
  await import("./index.js");
  const handler = getHandler();
  vi.mocked(dispatch).mockRejectedValue(new Error("dispatch failed"));

  await expect(handler()).rejects.toThrow("dispatch failed");
});
