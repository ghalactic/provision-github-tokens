import { debug, info, warning } from "@actions/core";
import { isWriteAccess } from "./access-level.js";
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
import { permissionAccess } from "./permissions.js";
import type { FindProvisionerOctokit } from "./provisioner-octokit.js";
import type { ProviderConfig } from "./type/provider-config.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { ProvisionResult } from "./type/provision-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

const DASHBOARD_LABEL_COLOR = "d4c5f9";
const CLOSE_COMMENT_PREFIX = "This dashboard will be closed because ";
const RESOLVED_REASON =
  "all provisioning issues for this repo have been resolved.";
const CONFIG_DISABLED_REASON =
  "token dashboards are disabled in this repo's requester config.";
const PROVIDER_DISABLED_REASON =
  "token dashboards are disabled in the provider config files.";

export type ReconcileDashboards = (
  context: Context,
  config: ProviderConfig,
  discovery: Map<string, DiscoveredRequester>,
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
    discovery,
    tokenResults,
    tokenCreationResults,
    provisionResults,
  ) => {
    debug("Reconciling token dashboards");

    const entries = [...discovery.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );

    for (const [repoName, discovered] of entries) {
      try {
        await reconcileRepo(
          context,
          config,
          discovered,
          tokenResults,
          tokenCreationResults,
          provisionResults,
        );
      } catch (error) {
        warning(
          `Failed to reconcile dashboard for ${repoName}: ` +
            errorMessage(error),
        );
      }
    }
  };

  async function reconcileRepo(
    context: Context,
    config: ProviderConfig,
    discovered: DiscoveredRequester,
    tokenResults: TokenAuthResult[],
    tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
    provisionResults: Map<
      ProvisionAuthResult,
      Map<ProvisionAuthTargetResult, ProvisionResult>
    >,
  ): Promise<void> {
    const { requester } = discovered;
    const repoName = repoRefToString(requester);
    const found = findProvisionerOctokit(requester);

    /* istanbul ignore next - discoverRequesters only records repos reachable via a provisioner - @preserve */
    if (!found) {
      throw new Error(
        `Invariant violation: No provisioner found for requester ${repoName}`,
      );
    }

    const [octokit, instReg] = found;

    if (
      !isWriteAccess(
        permissionAccess(instReg.installation.permissions, "issues"),
      )
    ) {
      warning(
        `Installation ${instReg.installation.id} doesn't have ` +
          `"issues: write" access - skipping dashboard for ${repoName}`,
      );

      return;
    }

    if (!config.dashboards.enabled) {
      await closeOpenDashboards(octokit, requester, PROVIDER_DISABLED_REASON);

      return;
    }

    if (discovered.configError) {
      const desired = renderConfigIssueDashboard(context, {
        requester,
        configPath: discovered.configPath,
        error: discovered.configError,
      });

      await upsertDashboard(octokit, requester, desired);

      return;
    }

    /* istanbul ignore next - discovery records a config or a config issue - @preserve */
    if (!discovered.config) {
      throw new Error(
        `Invariant violation: Discovered requester ${repoName} has no config`,
      );
    }

    if (!discovered.config.dashboard.enabled) {
      await closeOpenDashboards(octokit, requester, CONFIG_DISABLED_REASON);

      return;
    }

    const desired = desiredIssue(
      context,
      requester,
      tokenResults,
      tokenCreationResults,
      provisionResults,
    );

    await upsertDashboard(octokit, requester, desired);
  }
}

type DashboardIssueRecord = {
  number: number;
  title: string;
  body?: string | null;
  labels: (string | { name?: string })[];
};

function desiredIssue(
  context: Context,
  ref: RepoReference,
  tokenResults: TokenAuthResult[],
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
): DashboardIssue | undefined {
  const secrets = requesterSecrets(ref, provisionResults);

  const hasFailures = secrets.some(
    (secret) => !isFullyProvisioned(secret, provisionResults),
  );

  if (hasFailures) {
    return renderFailureDashboard(
      context,
      secrets,
      tokenResults,
      tokenCreationResults,
      provisionResults,
    );
  }

  return undefined;
}

function requesterSecrets(
  ref: RepoReference,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
): ProvisionAuthResult[] {
  const requesterSecrets: ProvisionAuthResult[] = [];

  for (const secret of provisionResults.keys()) {
    if (repoRefToString(secret.request.requester) === repoRefToString(ref)) {
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
      `Created dashboard issue #${created.data.number} in ${repoRefToString(ref)}`,
    );

    return;
  }

  const [newest] = openIssues.slice(-1);

  for (const issue of openIssues) {
    if (issue.number === newest.number) continue;

    await closeIssue(octokit, ref, issue.number);
  }

  if (!desired) {
    await closeIssue(octokit, ref, newest.number, RESOLVED_REASON);

    return;
  }

  await octokit.rest.issues.update({
    owner: ref.account,
    repo: ref.repo,
    issue_number: newest.number,
    title: desired.title,
    body: toMarkdown(desired.body),
  });

  info(`Updated dashboard issue #${newest.number} in ${repoRefToString(ref)}`);
}

async function closeOpenDashboards(
  octokit: Octokit,
  ref: RepoReference,
  reason: string,
): Promise<void> {
  const openIssues = await openDashboardIssues(octokit, ref);

  if (openIssues.length < 1) {
    debug(`No open dashboard issue in ${repoRefToString(ref)}`);

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
    { owner: ref.account, repo: ref.repo, state: "open" },
  );

  for await (const { data } of issuePages) {
    for (const issue of data) {
      for (const label of issue.labels as { name: string }[]) {
        if (label.name === DASHBOARD_LABEL) {
          openIssues.push(issue);
          break;
        }
      }
    }
  }

  openIssues.sort((a, b) => a.number - b.number);

  debug(`Found ${openIssues.length} open dashboard issue(s) in ${repoName}`);

  return openIssues;
}

async function closeIssue(
  octokit: Octokit,
  ref: RepoReference,
  number: number,
  reason?: string,
): Promise<void> {
  if (reason) {
    await octokit.rest.issues.createComment({
      owner: ref.account,
      repo: ref.repo,
      issue_number: number,
      body: `${CLOSE_COMMENT_PREFIX}${reason}`,
    });
  }

  await octokit.rest.issues.update({
    owner: ref.account,
    repo: ref.repo,
    issue_number: number,
    state: "closed",
  });

  info(`Closed dashboard issue #${number} in ${repoRefToString(ref)}`);
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
      color: DASHBOARD_LABEL_COLOR,
      description: DASHBOARD_LABEL_DESCRIPTION,
    });

    debug(`Created dashboard label in ${repoRefToString(ref)}`);
  } catch (cause) {
    handleRequestError(cause, {
      422: (cause) => {
        if (!requestErrorHasError(cause, { code: "already_exists" })) {
          throw new Error("Unable to create token dashboard label", { cause });
        }

        debug(`Dashboard label already exists in ${repoRefToString(ref)}`);
      },
    });
  }
}
