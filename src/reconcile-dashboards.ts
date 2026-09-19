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
const CLOSE_COMMENT_PREFIX = "This dashboard is being closed because ";
const RESOLVED_REASON =
  "all provisioning issues for this repo have been resolved.";
const CONFIG_DISABLED_REASON =
  "token dashboards are disabled in this repo's requester config.";
const PROVIDER_DISABLED_REASON =
  "token dashboards are disabled in the provider config files.";

type DashboardIssueRecord = {
  number: number;
  title: string;
  body?: string | null;
  labels: (string | { name?: string })[];
};

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
      try {
        await reconcileRepo(
          repoName,
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
    repoName: string,
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
      await closeOpenDashboards(octokit, repoName, PROVIDER_DISABLED_REASON);

      return;
    }

    if (requester && !requester.config.dashboard.enabled) {
      await closeOpenDashboards(octokit, repoName, CONFIG_DISABLED_REASON);

      return;
    }

    const desired = desiredIssue(
      githubServerUrl,
      runUrl,
      configIssue,
      repoName,
      tokenResults,
      tokenCreationResults,
      provisionResults,
    );

    await upsertDashboard(octokit, repoName, desired);
  }
}

function desiredIssue(
  githubServerUrl: string,
  runUrl: string,
  configIssue: RequesterConfigIssue | undefined,
  repoName: string,
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

  const failures = repoFailures(repoName, provisionResults);

  if (failures.length > 0) {
    return renderFailureDashboard(
      runUrl,
      failures,
      tokenResults,
      tokenCreationResults,
      provisionResults,
    );
  }

  return undefined;
}

function repoFailures(
  repoName: string,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
): ProvisionAuthResult[] {
  const failures: ProvisionAuthResult[] = [];

  for (const secret of provisionResults.keys()) {
    if (repoRefToString(secret.request.requester) !== repoName) continue;

    if (!isFullyProvisioned(secret, provisionResults)) failures.push(secret);
  }

  return failures;
}

async function upsertDashboard(
  octokit: Octokit,
  repoName: string,
  desired: DashboardIssue | undefined,
): Promise<void> {
  const ref = repoRefFromName(repoName);
  const openIssue = await firstOpenDashboardIssue(octokit, ref);

  if (!desired) {
    if (openIssue)
      await closeIssue(octokit, ref, openIssue.number, RESOLVED_REASON);

    return;
  }

  if (!openIssue) {
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

  if (
    openIssue.title === desired.title &&
    (openIssue.body ?? "") === desired.body
  ) {
    debug(
      `Dashboard issue #${openIssue.number} in ${repoRefToString(ref)} is up to date`,
    );

    return;
  }

  await octokit.rest.issues.update({
    owner: ref.account,
    repo: ref.repo,
    issue_number: openIssue.number,
    title: desired.title,
    body: desired.body,
  });

  info(
    `Updated dashboard issue #${openIssue.number} in ${repoRefToString(ref)}`,
  );
}

async function closeOpenDashboards(
  octokit: Octokit,
  repoName: string,
  reason: string,
): Promise<void> {
  const ref = repoRefFromName(repoName);
  const openIssues = await openDashboardIssues(octokit, ref);

  if (openIssues.length < 1) {
    debug(`No open dashboard issue in ${repoRefToString(ref)}`);

    return;
  }

  for (const issue of openIssues) {
    await closeIssue(octokit, ref, issue.number, reason);
  }
}

async function firstOpenDashboardIssue(
  octokit: Octokit,
  ref: RepoReference,
): Promise<DashboardIssueRecord | undefined> {
  const [first = undefined] = await openDashboardIssues(octokit, ref);

  return first;
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
      if (
        issue.state !== "open" ||
        !issue.labels.some((label) => isDashboardLabel(label))
      ) {
        continue;
      }

      openIssues.push(issue);
    }
  }

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
  reason: string,
): Promise<void> {
  await octokit.rest.issues.update({
    owner: ref.account,
    repo: ref.repo,
    issue_number: number,
    state: "closed",
  });

  await octokit.rest.issues.createComment({
    owner: ref.account,
    repo: ref.repo,
    issue_number: number,
    body: `${CLOSE_COMMENT_PREFIX}${reason}`,
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
