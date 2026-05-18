import { dispatch } from "../dispatch.js";

/* eslint-disable @typescript-eslint/naming-convention -- Cloudflare env bindings use uppercase names */
export interface Env {
  GITHUB_APP_ID: string;
  GITHUB_APP_PK: string;
  GITHUB_REPO: string;
  GITHUB_WORKFLOW: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

export default {
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await dispatch({
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PK,
      repo: env.GITHUB_REPO,
      workflow: env.GITHUB_WORKFLOW,
    });
  },
};

interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}
