import { createServer } from "node:http";
import { dispatch } from "../dispatch.js";

const port = Number(process.env.PORT) || 8080;

const server = createServer((_req, res) => {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PK;
  const repo = process.env.GITHUB_REPO;
  const workflow = process.env.GITHUB_WORKFLOW;

  if (!appId || !privateKey || !repo || !workflow) {
    res.writeHead(500).end("Missing required environment variables");

    return;
  }

  dispatch({ appId, privateKey, repo, workflow }).then(
    () => {
      res.writeHead(200).end();
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      res.writeHead(500).end(message);
    },
  );
});

server.listen(port);
