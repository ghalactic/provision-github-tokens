import { app } from "@azure/functions";
import { dispatch } from "../dispatch.js";

app.timer("schedulerTimer", {
  schedule: "0 */30 * * * *",
  handler: async () => {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PK;
    const repo = process.env.GITHUB_REPO;
    const workflow = process.env.GITHUB_WORKFLOW;

    if (!appId || !privateKey || !repo || !workflow) {
      throw new Error("Missing required environment variables");
    }

    await dispatch({ appId, privateKey, repo, workflow });
  },
});
