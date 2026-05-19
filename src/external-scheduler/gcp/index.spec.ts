import type { IncomingMessage, ServerResponse } from "node:http";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("../dispatch.js", () => ({
  dispatch: vi.fn().mockResolvedValue(undefined),
}));

const mockListen = vi.fn();

vi.mock("node:http", () => ({
  createServer: vi.fn(() => ({ listen: mockListen })),
}));

import { createServer } from "node:http";
import { dispatch } from "../dispatch.js";

function makeRes() {
  const res = {
    writeHead: vi.fn().mockReturnThis(),
    end: vi.fn(),
  };

  return res as unknown as ServerResponse;
}

function getHandler() {
  return vi.mocked(createServer).mock.calls[0][0] as (
    req: IncomingMessage,
    res: ServerResponse,
  ) => Promise<void>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("GITHUB_APP_ID", "12345");
  vi.stubEnv("GITHUB_APP_PK", "fake-key");
  vi.stubEnv("GITHUB_REPO", "owner/repo");
  vi.stubEnv("GITHUB_WORKFLOW", "provision-tokens.yml");
  vi.stubEnv("PORT", "9999");
  vi.resetModules();
});

it("starts an HTTP server on the PORT env var", async () => {
  await import("./index.js");

  expect(createServer).toHaveBeenCalled();
  expect(mockListen).toHaveBeenCalledWith(9999);
});

it("defaults to port 8080 when PORT is not set", async () => {
  vi.stubEnv("PORT", "");
  await import("./index.js");

  expect(mockListen).toHaveBeenCalledWith(8080);
});

it("calls dispatch and returns 200 on success", async () => {
  await import("./index.js");
  const handler = getHandler();
  const res = makeRes();

  await handler({} as IncomingMessage, res);

  expect(dispatch).toHaveBeenCalledWith({
    appId: "12345",
    privateKey: "fake-key",
    repo: "owner/repo",
    workflow: "provision-tokens.yml",
  });
  expect(res.writeHead).toHaveBeenCalledWith(200);
});

it("returns 500 when env vars are missing", async () => {
  vi.stubEnv("GITHUB_APP_ID", "");
  await import("./index.js");
  const handler = getHandler();
  const res = makeRes();

  await handler({} as IncomingMessage, res);

  expect(res.writeHead).toHaveBeenCalledWith(500);
  expect(res.end).toHaveBeenCalledWith(
    "Missing required environment variables",
  );
});

it("returns 500 with error message on dispatch failure", async () => {
  await import("./index.js");
  vi.mocked(dispatch).mockRejectedValue(new Error("dispatch failed"));
  const handler = getHandler();
  const res = makeRes();

  await handler({} as IncomingMessage, res);

  expect(res.writeHead).toHaveBeenCalledWith(500);
  expect(res.end).toHaveBeenCalledWith("dispatch failed");
});
