import type { LinkReference, RootContent, TableCell } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { AuthorizeResult } from "./authorizer.js";
import {
  accountOrRepoRefToString,
  type AccountOrRepoReference,
} from "./github-reference.js";
import {
  gfmAlert,
  heading,
  inlineCode,
  link,
  paragraph,
  renderIcon,
  table,
  text,
} from "./markdown.js";
import { pluralize } from "./pluralize.js";
import type { ProvisionRequestTarget } from "./provision-request.js";
import type { ProvisioningResult } from "./provisioner.js";
import type { TokenCreationResult } from "./token-factory.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";

const LINK_REF_PREFIX = "gh/";
const MAX_ROWS = 1000;

export function renderSummary(
  githubServerUrl: string,
  actionUrl: string,
  authResult: AuthorizeResult,
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): string {
  const { provisionResults: authResults } = authResult;

  const allDeniedRows = authResults.filter(
    (r) => !isFullyProvisioned(r, provisionResults),
  );
  const allAllowedRows = authResults.filter((r) =>
    isFullyProvisioned(r, provisionResults),
  );

  const deniedRows = allDeniedRows.slice(0, MAX_ROWS);
  const remainingRowCount = Math.max(0, MAX_ROWS - deniedRows.length);
  const allowedRows = allAllowedRows.slice(0, remainingRowCount);

  const omittedDeniedCount = allDeniedRows.length - deniedRows.length;
  const omittedAllowedCount = allAllowedRows.length - allowedRows.length;
  const omittedCount = omittedDeniedCount + omittedAllowedCount;

  const definitions: Record<string, string> = {};

  return toMarkdown(
    {
      type: "root",
      children: [
        statsHeading(authResults, provisionResults),
        ...emptySection(authResults, authResult, actionUrl),
        ...failuresTable(
          deniedRows,
          tokenCreationResults,
          provisionResults,
          definitions,
          githubServerUrl,
        ),
        ...successesTable(allowedRows, definitions, githubServerUrl),
        ...omittedNotice(authResults.length, omittedCount),
        ...definitionsAst(definitions),
      ],
    },
    { bullet: "-", extensions: [gfmToMarkdown()] },
  );
}

function statsHeading(
  authResults: ProvisionAuthResult[],
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): RootContent {
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
            `${pluralize(totalCount, "secret", "secrets")}`,
    ),
  );
}

function emptySection(
  authResults: ProvisionAuthResult[],
  authResult: AuthorizeResult,
  actionUrl: string,
): RootContent[] {
  if (authResults.length > 0 || authResult.tokenResults.length > 0) return [];

  return [
    gfmAlert(
      "TIP",
      paragraph(
        text("Need help getting started? See the "),
        link(new URL("#readme", actionUrl), text("docs")),
        text("."),
      ),
    ),
  ];
}

function failuresTable(
  deniedRows: ProvisionAuthResult[],
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
  definitions: Record<string, string>,
  githubServerUrl: string,
): RootContent[] {
  if (deniedRows.length === 0) return [];

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
      deniedRows.map((r) =>
        failureRow(
          r,
          tokenCreationResults,
          provisionResults,
          definitions,
          githubServerUrl,
        ),
      ),
    ),
  ];
}

function successesTable(
  allowedRows: ProvisionAuthResult[],
  definitions: Record<string, string>,
  githubServerUrl: string,
): RootContent[] {
  if (allowedRows.length === 0) return [];

  return [
    table(
      ["left", "left", "left", "left"],
      [[], [text("Requester")], [text("Secret")], [text("Targets")]],
      allowedRows.map((r) => successRow(r, definitions, githubServerUrl)),
    ),
  ];
}

function omittedNotice(
  totalCount: number,
  omittedCount: number,
): RootContent[] {
  if (omittedCount === 0) return [];

  return [
    gfmAlert(
      "IMPORTANT",
      paragraph(
        text(
          `Showing ${totalCount - omittedCount} of ${totalCount} secrets. ` +
            `Check the logs for the full list.`,
        ),
      ),
    ),
  ];
}

function successRow(
  result: ProvisionAuthResult,
  definitions: Record<string, string>,
  githubServerUrl: string,
): TableCell["children"][] {
  addAccountOrRepoDef(definitions, githubServerUrl, result.request.requester);

  return [
    [text(renderIcon(true))],
    [accountOrRepoLinkRef(result.request.requester)],
    [inlineCode(result.request.name)],
    targetCellChildren(result.request.to, definitions, githubServerUrl),
  ];
}

function failureRow(
  result: ProvisionAuthResult,
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
  definitions: Record<string, string>,
  githubServerUrl: string,
): TableCell["children"][] {
  addAccountOrRepoDef(definitions, githubServerUrl, result.request.requester);

  return [
    [text(renderIcon(false))],
    [accountOrRepoLinkRef(result.request.requester)],
    [inlineCode(result.request.name)],
    targetCellChildren(result.request.to, definitions, githubServerUrl),
    [text(failureReason(result, tokenCreationResults, provisionResults))],
  ];
}

function failureReason(
  authResult: ProvisionAuthResult,
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): string {
  if (authResult.isMissingTargets || authResult.request.to.length === 0) {
    return "Failed to provision";
  }

  for (const targetAuth of authResult.results) {
    if (!targetAuth.isTokenAllowed) return "Token not allowed";
  }

  if (!authResult.isAllowed) return "Secret not allowed";

  for (const targetAuth of authResult.results) {
    /* istanbul ignore next - @preserve */
    if (!targetAuth.tokenAuthResult) {
      throw new Error(
        "Invariant violation: Missing token auth result for allowed target",
      );
    }

    const tokenResult = tokenCreationResults.get(targetAuth.tokenAuthResult);

    /* istanbul ignore next - @preserve */
    if (!tokenResult) {
      throw new Error(
        "Invariant violation: Missing token creation result for allowed target",
      );
    }

    switch (tokenResult.type) {
      case "NO_ISSUER":
        return "No suitable issuer";

      case "REQUEST_ERROR":
      case "ERROR":
        return "Failed to issue token";
    }
  }

  const targetResults = provisionResults.get(authResult);

  /* istanbul ignore next - @preserve */
  if (!targetResults) {
    throw new Error(
      "Invariant violation: Missing provisioning results for auth result",
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

function isFullyProvisioned(
  authResult: ProvisionAuthResult,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): boolean {
  const targetResults = provisionResults.get(authResult);

  if (!targetResults?.size) return false;

  for (const result of targetResults.values()) {
    if (result.type !== "PROVISIONED") return false;
  }

  return true;
}

function targetCellChildren(
  targets: ProvisionRequestTarget[],
  definitions: Record<string, string>,
  githubServerUrl: string,
): TableCell["children"] {
  const seen = new Set<string>();
  const refs: [key: string, ref: AccountOrRepoReference][] = [];

  for (const t of targets) {
    addAccountOrRepoDef(definitions, githubServerUrl, t.target);
    const key = accountOrRepoRefToString(t.target).toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      refs.push([key, t.target]);
    }
  }

  refs.sort(([a], [b]) => a.localeCompare(b));

  const children: TableCell["children"] = [];

  for (let i = 0; i < refs.length; ++i) {
    if (i > 0) children.push(text(", "));
    children.push(accountOrRepoLinkRef(refs[i][1]));
  }

  return children;
}

function definitionsAst(definitions: Record<string, string>): RootContent[] {
  return Object.entries(definitions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([identifier, url]) => ({
      type: "definition",
      identifier,
      label: identifier,
      url,
      title: null,
    }));
}

function accountOrRepoLinkRef(
  accountOrRepo: AccountOrRepoReference,
): LinkReference {
  const slug = accountOrRepoRefToString(accountOrRepo);
  const identifier = `${LINK_REF_PREFIX}${slug}`.toLowerCase();

  return {
    type: "linkReference",
    identifier,
    label: identifier,
    referenceType: "full",
    children: [text(slug)],
  };
}
function addAccountOrRepoDef(
  definitions: Record<string, string>,
  githubServerUrl: string,
  accountOrRepo: AccountOrRepoReference,
): void {
  const slug = accountOrRepoRefToString(accountOrRepo).toLowerCase();
  const identifier = `${LINK_REF_PREFIX}${slug}`.toLowerCase();

  definitions[identifier] = new URL(slug, githubServerUrl).toString();
}
