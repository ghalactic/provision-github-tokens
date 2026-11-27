import type { LinkReference, RootContent, TableCell } from "mdast";
import type { AuthorizeResult } from "./authorizer.js";
import { ValidateError } from "./config/validation.js";
import { ParseYamlError } from "./config/yaml.js";
import type { Context } from "./context.js";
import type { DiscoveredRequester } from "./discover-requesters.js";
import {
  accountOrRepoRefToString,
  repoRefToString,
  type AccountOrRepoReference,
} from "./github-reference.js";
import { FAIL_ICON, PASS_ICON, WARN_ICON } from "./icon.js";
import { isFullyProvisioned } from "./is-fully-provisioned.js";
import {
  definition,
  emphasis,
  footnoteDefinition,
  footnoteReference,
  gfmAlert,
  heading,
  inlineCode,
  linkReference,
  paragraph,
  table,
  text,
  toMarkdown,
} from "./markdown.js";
import { pluralize } from "./pluralize.js";
import type { ProvisionRequestTarget } from "./provision-request.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { ProvisionResult } from "./type/provision-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

const LINK_REF_PREFIX = "gh/";
const MAX_ROWS = 1000;
const FALLBACK_FOOTNOTE_ID = "fallback";
const FALLBACK_FOOTNOTE_TEXT =
  "One or more issuers or provisioners failed, and a fallback was used. " +
  "Re-run with debug logging enabled for details.";

export function renderSummary(
  context: Context,
  requesters: Map<string, DiscoveredRequester>,
  authResult: AuthorizeResult,
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
): string {
  const { provisionResults: authResults } = authResult;

  const allConfigIssues = discoveredConfigIssues();
  const configIssues = allConfigIssues.slice(0, MAX_ROWS);
  const remainingAfterConfigIssues = Math.max(
    0,
    MAX_ROWS - configIssues.length,
  );

  const allDeniedRows = authResults.filter(
    (r) => !isFullyProvisioned(r, provisionResults),
  );
  const allAllowedRows = authResults.filter((r) =>
    isFullyProvisioned(r, provisionResults),
  );

  const deniedRows = allDeniedRows.slice(0, remainingAfterConfigIssues);
  const remainingRowCount = Math.max(
    0,
    remainingAfterConfigIssues - deniedRows.length,
  );
  const allowedRows = allAllowedRows.slice(0, remainingRowCount);

  const omittedDeniedCount = allDeniedRows.length - deniedRows.length;
  const omittedAllowedCount = allAllowedRows.length - allowedRows.length;
  const omittedCount = omittedDeniedCount + omittedAllowedCount;

  let anyFallback = false;

  for (const row of allowedRows) {
    if (rowUsesFallback(row)) {
      anyFallback = true;

      break;
    }
  }

  const definitions: Record<string, string> = {};

  return toMarkdown([
    ...configIssuesSection(),
    statsHeading(),
    ...emptySection(),
    ...failuresTable(),
    ...successesTable(),
    ...omittedNotice(
      authResults.length - omittedCount,
      authResults.length,
      "secrets",
    ),
    ...definitionsAst(),
    ...fallbackFootnote(),
  ]);

  function discoveredConfigIssues(): ConfigIssue[] {
    const configIssues: ConfigIssue[] = [];

    for (const discovered of requesters.values()) {
      if (discovered.configError) {
        configIssues.push({ discovered, error: discovered.configError });
      }
    }

    configIssues.sort((a, b) =>
      repoRefToString(a.discovered.requester).localeCompare(
        repoRefToString(b.discovered.requester),
      ),
    );

    return configIssues;
  }

  function configIssuesSection(): RootContent[] {
    if (configIssues.length < 1) return [];

    const rows: TableCell["children"][][] = [];

    for (const configIssue of configIssues) {
      rows.push(configIssueRow(configIssue));
    }

    const requesterConfigCount = pluralize(
      allConfigIssues.length,
      "requester config",
      "requester configs",
    );

    return [
      heading(3, text("Config issues")),
      gfmAlert(
        "WARNING",
        paragraph(
          text(`${requesterConfigCount} couldn't be parsed or validated.`),
        ),
      ),
      table(
        ["left", "left", "left"],
        [[], [text("Requester")], [text("Reason")]],
        rows,
      ),
      ...omittedNotice(
        configIssues.length,
        allConfigIssues.length,
        "config issues",
      ),
    ];
  }

  function configIssueRow(configIssue: ConfigIssue): TableCell["children"][] {
    const { discovered, error } = configIssue;

    addAccountOrRepoDef(discovered.requester);

    return [
      [text(FAIL_ICON)],
      [accountOrRepoLinkRef(discovered.requester)],
      [
        linkReference(
          "full",
          addConfigDef(discovered),
          text(configIssueReason(error)),
        ),
      ],
    ];
  }

  function configIssueReason(error: Error): string {
    if (error instanceof ParseYamlError) return "Invalid YAML";
    if (error instanceof ValidateError) return "Invalid configuration";

    return "Unexpected error";
  }

  function statsHeading(): RootContent {
    const totalCount = authResults.length;
    const allowedCount = authResults.filter((r) =>
      isFullyProvisioned(r, provisionResults),
    ).length;

    return heading(
      3,
      text(
        allowedCount === totalCount
          ? `Provisioned ${pluralize(totalCount, "secret", "secrets")}`
          : `Provisioned ${allowedCount} of ` +
              pluralize(totalCount, "secret", "secrets"),
      ),
    );
  }

  function emptySection(): RootContent[] {
    if (
      allConfigIssues.length > 0 ||
      authResults.length > 0 ||
      authResult.tokenResults.length > 0
    ) {
      return [];
    }

    return [
      gfmAlert(
        "TIP",
        paragraph(
          text("Need help getting started? See the "),
          linkReference("shortcut", "docs", text("docs")),
          text("."),
        ),
      ),
      definition(
        "docs",
        "https://github.com/ghalactic/provision-github-tokens#readme",
      ),
    ];
  }

  function failuresTable(): RootContent[] {
    if (deniedRows.length < 1) return [];

    return [
      table(
        ["left", "left", "left", "left", "left"],
        [
          [],
          [text("Requester")],
          [text("Secret")],
          [text("Targets")],
          [text("Reason")],
        ],
        deniedRows.map((r) => failureRow(r)),
      ),
    ];
  }

  function failureRow(result: ProvisionAuthResult): TableCell["children"][] {
    addAccountOrRepoDef(result.request.requester);

    return [
      [text(FAIL_ICON)],
      [accountOrRepoLinkRef(result.request.requester)],
      [inlineCode(result.request.name)],
      targetCellChildren(result.request.to),
      [text(failureReason(result))],
    ];
  }

  function successesTable(): RootContent[] {
    if (allowedRows.length < 1) return [];

    return [
      table(
        ["left", "left", "left", "left"],
        [[], [text("Requester")], [text("Secret")], [text("Targets")]],
        allowedRows.map((r) => successRow(r)),
      ),
    ];
  }

  function successRow(result: ProvisionAuthResult): TableCell["children"][] {
    addAccountOrRepoDef(result.request.requester);

    const fallback = rowUsesFallback(result);
    const statusCell: TableCell["children"] = [
      text(fallback ? WARN_ICON : PASS_ICON),
    ];

    if (fallback) statusCell.push(footnoteReference(FALLBACK_FOOTNOTE_ID));

    return [
      statusCell,
      [accountOrRepoLinkRef(result.request.requester)],
      [inlineCode(result.request.name)],
      targetCellChildren(result.request.to),
    ];
  }

  function rowUsesFallback(result: ProvisionAuthResult): boolean {
    // All targets in a secret share the same token declaration, so every
    // target uses the same token creation result.
    const firstTarget = result.results[0];

    /* istanbul ignore next - allowed rows always have a token result - @preserve */
    if (!firstTarget?.tokenAuthResult) return false;

    const tokenResult = tokenCreationResults.get(firstTarget.tokenAuthResult);

    if (
      tokenResult?.type === "CREATED" &&
      tokenResult.failedAttempts.length > 0
    ) {
      return true;
    }

    const targetResults = provisionResults.get(result);

    /* istanbul ignore next - allowed rows always have provision results - @preserve */
    if (!targetResults) return false;

    for (const targetResult of targetResults.values()) {
      if (
        targetResult.type === "PROVISIONED" &&
        targetResult.failedAttempts.length > 0
      ) {
        return true;
      }
    }

    return false;
  }

  function fallbackFootnote(): RootContent[] {
    if (!anyFallback) return [];

    return [
      footnoteDefinition(
        FALLBACK_FOOTNOTE_ID,
        paragraph(text(FALLBACK_FOOTNOTE_TEXT)),
      ),
    ];
  }

  function omittedNotice(
    shownCount: number,
    totalCount: number,
    noun: string,
  ): RootContent[] {
    if (totalCount - shownCount < 1) return [];

    return [
      gfmAlert(
        "IMPORTANT",
        paragraph(
          text(
            `Showing ${shownCount} of ${totalCount} ${noun}. ` +
              `Check the logs for the full list.`,
          ),
        ),
      ),
    ];
  }

  function failureReason(authResult: ProvisionAuthResult): string {
    if (
      authResult.isMissingTargets ||
      authResult.request.to.length < 1 ||
      authResult.results.length < 1
    ) {
      return "No targets to provision to";
    }

    if (authResult.request.tokenDec == null) {
      return authResult.request.tokenDecIsRegistered
        ? "Token declaration isn't shared"
        : "Token declaration doesn't exist";
    }

    if (!authResult.results.every((t) => t.isTokenAllowed)) {
      return "Token not allowed";
    }

    if (!authResult.isAllowed) return "Secret not allowed";

    // All targets in a secret share the same token declaration, and the
    // consumer doesn't affect issuer selection, so the token creation result is
    // the same for every target — just check the first one.
    const firstTarget = authResult.results[0];

    /* istanbul ignore next - @preserve */
    if (!firstTarget.tokenAuthResult) {
      throw new Error(
        "Invariant violation: Missing token auth result for allowed target",
      );
    }

    const tokenResult = tokenCreationResults.get(firstTarget.tokenAuthResult);

    /* istanbul ignore next - @preserve */
    if (!tokenResult) {
      throw new Error(
        "Invariant violation: Missing token creation result for allowed target",
      );
    }

    if (tokenResult.type === "NO_ISSUER") return "No suitable issuer";

    if (tokenResult.type === "FAILED") {
      return "Failed to issue token";
    }

    const targetResults = provisionResults.get(authResult);

    /* istanbul ignore next - @preserve */
    if (!targetResults) {
      throw new Error(
        "Invariant violation: Missing provision results for auth result",
      );
    }

    let provisionedCount = 0;
    let failedCount = 0;
    let hasNoProvisioner = false;

    for (const result of targetResults.values()) {
      if (result.type === "PROVISIONED") {
        ++provisionedCount;
      } else {
        ++failedCount;
        if (result.type === "NO_PROVISIONER") hasNoProvisioner = true;
      }
    }

    if (hasNoProvisioner && failedCount === targetResults.size) {
      return "No suitable provisioner";
    }

    if (provisionedCount > 0 && failedCount > 0) {
      return "Failed to provision to some targets";
    }

    return "Failed to provision";
  }

  function targetCellChildren(
    targets: ProvisionRequestTarget[],
  ): TableCell["children"] {
    if (targets.length < 1) return [emphasis(text("(none)"))];

    const refs = new Map<string, AccountOrRepoReference>();

    for (const t of targets) {
      const identifier = addAccountOrRepoDef(t.target);

      if (!refs.has(identifier)) refs.set(identifier, t.target);
    }

    const refOrder = [...refs.keys()].sort((a, b) => a.localeCompare(b));
    const children: TableCell["children"] = [];

    for (let i = 0; i < refOrder.length; ++i) {
      if (i > 0) children.push(text(", "));
      children.push(accountOrRepoLinkRef(refs.get(refOrder[i])!));
    }

    return children;
  }

  function definitionsAst(): RootContent[] {
    const entries = Object.entries(definitions).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    const ast: RootContent[] = [];

    for (const [identifier, url] of entries) {
      ast.push(definition(identifier, url));
    }

    return ast;
  }

  function accountOrRepoLinkRef(
    accountOrRepo: AccountOrRepoReference,
  ): LinkReference {
    const slug = accountOrRepoRefToString(accountOrRepo);
    const identifier = `${LINK_REF_PREFIX}${slug}`.toLowerCase();

    return linkReference("full", identifier, text(slug));
  }

  function addAccountOrRepoDef(accountOrRepo: AccountOrRepoReference): string {
    const slug = accountOrRepoRefToString(accountOrRepo).toLowerCase();
    const identifier = `${LINK_REF_PREFIX}${slug}`.toLowerCase();

    definitions[identifier] = new URL(slug, context.githubServerUrl).toString();

    return identifier;
  }

  function addConfigDef(discovered: DiscoveredRequester): string {
    const { requester, configSha, configPath } = discovered;
    const slug = repoRefToString(requester).toLowerCase();
    const identifier = `${LINK_REF_PREFIX}${slug}/config`;

    definitions[identifier] = new URL(
      `${requester.account}/${requester.repo}` +
        `/blob/${configSha}/${configPath}`,
      context.githubServerUrl,
    ).toString();

    return identifier;
  }
}

type ConfigIssue = {
  discovered: DiscoveredRequester;
  error: Error;
};
