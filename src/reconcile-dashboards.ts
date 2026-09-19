import { debug, info, warning } from "@actions/core";
import { isWriteAccess } from "./access-level.js";
import {
  DASHBOARD_LABEL,
  renderConfigIssueDashboard,
  renderFailureDashboard,
  type DashboardIssue,
} from "./dashboard.js";
import type {
  DiscoverRequestersResult,
  RequesterConfigIssue,
} from "./discover-requesters.js";
import { errorMessage } from "./error.js";
import { isFullyProvisioned } from "./failure-reason.js";
import {
  repoRefFromName,
  repoRefToString,
  type RepoReference,
} from "./github-reference.js";
import {
  handleRequestError,
  type Octokit,
  type OctokitFactory,
} from "./octokit.js";
import { permissionAccess } from "./permissions.js";
import type { AppInput } from "./type/input.js";
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
  githubServerUrl: string,
  runUrl: string,
  config: ProviderConfig,
  discovery: DiscoverRequestersResult,
  tokenResults: TokenAuthResult[],
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
) => Promise<void>;

export function createReconcileDashboards(
  octokitFactory: OctokitFactory,
  appsInput: AppInput[],
): ReconcileDashboards {
  return async (
    githubServerUrl,
    runUrl,
    config,
    discovery,
    tokenResults,
    tokenCreationResults,
    provisionResults,
  ) => {
    debug("Reconciling token dashboards");

    const repoNames = new Set([
      ...discovery.requesters.keys(),
      ...discovery.configIssues.keys(),
    ]);

    for (const repoName of [...repoNames].sort()) {
      const ref = repoRefFromName(repoName);

      try {
        await reconcileRepo(
          ref,
          githubServerUrl,
          runUrl,
          config,
          discovery,
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
    ref: RepoReference,
    githubServerUrl: string,
    runUrl: string,
    config: ProviderConfig,
    discovery: DiscoverRequestersResult,
    tokenResults: TokenAuthResult[],
    tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
    provisionResults: Map<
      ProvisionAuthResult,
      Map<ProvisionAuthTargetResult, ProvisionResult>
    >,
  ): Promise<void> {
    const repoName = repoRefToString(ref);
    const instReg = discovery.installations.get(repoName);

    /* istanbul ignore next - Set by discoverRequesters - @preserve */
    if (!instReg) {
      throw new Error(
        `Invariant violation: ` +
          `No installation recorded for requester ${repoName}`,
      );
    }

    const octokit = octokitFactory.installationOctokit(
      appsInput,
      instReg.installation.app_id,
      instReg.installation.id,
    );

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

    const requester = discovery.requesters.get(repoName);
    const configIssue = discovery.configIssues.get(repoName);

    if (!config.dashboards.enabled) {
      await closeOpenDashboards(octokit, ref, PROVIDER_DISABLED_REASON);

      return;
    }

    if (requester && !requester.config.dashboard.enabled) {
      await closeOpenDashboards(octokit, ref, CONFIG_DISABLED_REASON);

      return;
    }

    const desired = desiredIssue(
      githubServerUrl,
      runUrl,
      configIssue,
      ref,
      tokenResults,
      tokenCreationResults,
      provisionResults,
    );

    await upsertDashboard(octokit, ref, desired);
  }
}

type DashboardIssueRecord = {
  number: number;
  title: string;
  body?: string | null;
  labels: (string | { name?: string })[];
};

function desiredIssue(
  githubServerUrl: string,
  runUrl: string,
  configIssue: RequesterConfigIssue | undefined,
  ref: RepoReference,
  tokenResults: TokenAuthResult[],
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
): DashboardIssue | undefined {
  if (configIssue) {
    return renderConfigIssueDashboard(githubServerUrl, runUrl, configIssue);
  }

  const secrets = requesterSecrets(ref, provisionResults);

  const hasFailures = secrets.some(
    (secret) => !isFullyProvisioned(secret, provisionResults),
  );

  if (hasFailures) {
    return renderFailureDashboard(
      runUrl,
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
      body: desired.body,
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
    body: desired.body,
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
    {
      owner: ref.account,
      repo: ref.repo,
      state: "open",
    },
  );

  for await (const { data } of issuePages) {
    for (const issue of data) {
      if (!issue.labels.some((label) => isDashboardLabel(label))) continue;

      openIssues.push(issue);
    }
  }

  openIssues.sort((a, b) => a.number - b.number);

  debug(`Found ${openIssues.length} open dashboard issue(s) in ${repoName}`);

  return openIssues;
}

function isDashboardLabel(label: string | { name?: string }): boolean {
  if (typeof label === "string") return label === DASHBOARD_LABEL;

  return label.name === DASHBOARD_LABEL;
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
  let labelExists = true;

  try {
    await octokit.rest.issues.getLabel({
      owner: ref.account,
      repo: ref.repo,
      name: DASHBOARD_LABEL,
    });
  } catch (error) {
    handleRequestError(error, {
      404: () => {
        labelExists = false;
      },
    });
  }

  if (labelExists) return;

  await octokit.rest.issues.createLabel({
    owner: ref.account,
    repo: ref.repo,
    name: DASHBOARD_LABEL,
    color: DASHBOARD_LABEL_COLOR,
    description: "Tracks provisioning failures reported by the token dashboard",
  });

  debug(`Created dashboard label in ${repoRefToString(ref)}`);
}
