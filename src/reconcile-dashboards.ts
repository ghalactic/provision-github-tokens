import { debug, info, error as logError } from "@actions/core";
import type { Context } from "./context.js";
import {
  DASHBOARD_LABEL,
  DASHBOARD_LABEL_DESCRIPTION,
  renderConfigIssueDashboard,
  renderFailureDashboard,
  type DashboardIssue,
} from "./dashboard.js";
import type { DiscoveredRequester } from "./discover-requesters.js";
import { errorMessage } from "./error.js";
import { repoRefToString, type RepoReference } from "./github-reference.js";
import { isFullyProvisioned } from "./is-fully-provisioned.js";
import { toMarkdown } from "./markdown.js";
import {
  handleRequestError,
  requestErrorHasError,
  type Octokit,
} from "./octokit.js";
import { pluralize } from "./pluralize.js";
import type { FindProvisionerOctokit } from "./provisioner-octokit.js";
import type { ProviderConfig } from "./type/provider-config.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { ProvisionResult } from "./type/provision-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

export type ReconcileDashboards = (
  context: Context,
  config: ProviderConfig,
  requesters: Map<string, DiscoveredRequester>,
  tokenResults: TokenAuthResult[],
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
) => Promise<void>;

export function createReconcileDashboards(
  findProvisionerOctokit: FindProvisionerOctokit,
): ReconcileDashboards {
  return async (
    context,
    config,
    requesters,
    tokenResults,
    tokenCreationResults,
    provisionResults,
  ) => {
    debug("Reconciling token dashboards");

    const entries = [...requesters.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );

    for (const [repoName, discovered] of entries) {
      try {
        await reconcileRepo(discovered);
      } catch (cause) {
        debug(
          `Failed to reconcile dashboard for ${repoName}: ` +
            errorMessage(cause),
        );
        logError(`Failed to reconcile dashboard for ${repoName}`);
      }
    }

    async function reconcileRepo(
      discovered: DiscoveredRequester,
    ): Promise<void> {
      const { requester } = discovered;
      const repoName = repoRefToString(requester);

      const found = findProvisionerOctokit(requester);
      /* istanbul ignore next - @preserve */
      if (!found) {
        throw new Error(
          `Invariant violation: No provisioner found for requester ${repoName}`,
        );
      }
      const [octokit] = found;

      if (!config.dashboards.enabled) {
        await closeOpenDashboards(
          octokit,
          requester,
          "the provider disabled them.",
        );

        return;
      }

      if (discovered.configError) {
        await upsertDashboard(
          octokit,
          requester,
          renderConfigIssueDashboard(context, discovered),
        );

        return;
      }

      /* istanbul ignore next - @preserve */
      if (!discovered.config) {
        throw new Error(
          `Invariant violation: Discovered requester ${repoName} has no config`,
        );
      }

      if (!discovered.config.dashboard.enabled) {
        await closeOpenDashboards(
          octokit,
          requester,
          "this repo disabled them.",
        );

        return;
      }

      await upsertDashboard(octokit, requester, desiredIssue(requester));
    }

    function desiredIssue(ref: RepoReference): DashboardIssue | undefined {
      const secrets = requesterSecrets(ref);

      for (const secret of secrets) {
        if (!isFullyProvisioned(secret, provisionResults)) {
          return renderFailureDashboard(
            context,
            secrets,
            tokenResults,
            tokenCreationResults,
            provisionResults,
          );
        }
      }

      return undefined;
    }

    function requesterSecrets(ref: RepoReference): ProvisionAuthResult[] {
      const requesterSecrets: ProvisionAuthResult[] = [];

      for (const secret of provisionResults.keys()) {
        if (
          repoRefToString(secret.request.requester) === repoRefToString(ref)
        ) {
          requesterSecrets.push(secret);
        }
      }

      return requesterSecrets;
    }

    async function upsertDashboard(
      octokit: Octokit,
      ref: RepoReference,
      desired: DashboardIssue | undefined,
    ): Promise<void> {
      const openIssues = await openDashboardIssues(octokit, ref);

      if (openIssues.length < 1) {
        if (!desired) return;

        await ensureDashboardLabel(octokit, ref);

        const created = await octokit.rest.issues.create({
          owner: ref.account,
          repo: ref.repo,
          title: desired.title,
          body: toMarkdown(desired.body),
          labels: [DASHBOARD_LABEL],
        });

        info(
          `Created dashboard ${context.githubServerUrl}` +
            `/${repoRefToString(ref)}/issues/${created.data.number}`,
        );

        return;
      }

      const [newest] = openIssues.slice(-1);

      for (const issue of openIssues) {
        if (issue.number === newest.number) continue;

        await closeIssue(
          octokit,
          ref,
          issue.number,
          "another dashboard already exists.",
        );
      }

      if (!desired) {
        await closeIssue(
          octokit,
          ref,
          newest.number,
          "all issues have been resolved.",
        );

        return;
      }

      await octokit.rest.issues.update({
        owner: ref.account,
        repo: ref.repo,
        issue_number: newest.number,
        title: desired.title,
        body: toMarkdown(desired.body),
      });

      info(
        `Updated dashboard ${context.githubServerUrl}` +
          `/${repoRefToString(ref)}/issues/${newest.number}`,
      );
    }

    async function closeOpenDashboards(
      octokit: Octokit,
      ref: RepoReference,
      reason: string,
    ): Promise<void> {
      const openIssues = await openDashboardIssues(octokit, ref);

      if (openIssues.length < 1) {
        debug(`No open dashboard in ${repoRefToString(ref)}`);

        return;
      }

      for (const issue of openIssues) {
        await closeIssue(octokit, ref, issue.number, reason);
      }
    }

    async function openDashboardIssues(
      octokit: Octokit,
      ref: RepoReference,
    ): Promise<DashboardIssueRecord[]> {
      const repoName = repoRefToString(ref);
      const openIssues: DashboardIssueRecord[] = [];

      const issuePages = octokit.paginate.iterator(
        octokit.rest.issues.listForRepo,
        {
          owner: ref.account,
          repo: ref.repo,
          state: "open",
          labels: DASHBOARD_LABEL,
          per_page: 100,
        },
      );

      for await (const { data } of issuePages) {
        openIssues.push(...data);
      }

      openIssues.sort((a, b) => a.number - b.number);

      const pluralizedOpenDashboards = pluralize(
        openIssues.length,
        "open dashboard",
        "open dashboards",
      );
      debug(`Found ${pluralizedOpenDashboards} in ${repoName}`);

      return openIssues;
    }

    async function closeIssue(
      octokit: Octokit,
      ref: RepoReference,
      number: number,
      reason: string,
    ): Promise<void> {
      await octokit.rest.issues.createComment({
        owner: ref.account,
        repo: ref.repo,
        issue_number: number,
        body: `Closing this dashboard because ${reason}`,
      });
      await octokit.rest.issues.update({
        owner: ref.account,
        repo: ref.repo,
        issue_number: number,
        state: "closed",
      });

      info(
        `Closed dashboard ${context.githubServerUrl}` +
          `/${repoRefToString(ref)}/issues/${number}`,
      );
    }

    async function ensureDashboardLabel(
      octokit: Octokit,
      ref: RepoReference,
    ): Promise<void> {
      try {
        await octokit.rest.issues.createLabel({
          owner: ref.account,
          repo: ref.repo,
          name: DASHBOARD_LABEL,
          color: "ffffff",
          description: DASHBOARD_LABEL_DESCRIPTION,
        });

        debug(`Created dashboard label in ${repoRefToString(ref)}`);
      } catch (cause) {
        handleRequestError(cause, {
          422: (cause) => {
            if (!requestErrorHasError(cause, { code: "already_exists" })) {
              throw new Error("Unable to create token dashboard label", {
                cause,
              });
            }

            debug(`Dashboard label already exists in ${repoRefToString(ref)}`);
          },
        });
      }
    }
  };
}

type DashboardIssueRecord = {
  number: number;
  title: string;
  body?: string | null;
  labels: (string | { name?: string })[];
};
