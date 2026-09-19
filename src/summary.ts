import type { LinkReference, RootContent, TableCell } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { AuthorizeResult } from "./authorizer.js";
import { failureReason, isFullyProvisioned } from "./failure-reason.js";
import {
  accountOrRepoRefToString,
  type AccountOrRepoReference,
} from "./github-reference.js";
import { FAIL_ICON, PASS_ICON } from "./icon.js";
import {
  emphasis,
  gfmAlert,
  heading,
  inlineCode,
  link,
  paragraph,
  table,
  text,
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

export function renderSummary(
  githubServerUrl: string,
  actionUrl: string,
  authResult: AuthorizeResult,
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
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
    Map<ProvisionAuthTargetResult, ProvisionResult>
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
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
  definitions: Record<string, string>,
  githubServerUrl: string,
): RootContent[] {
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
  if (allowedRows.length < 1) return [];

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
  if (omittedCount < 1) return [];

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
    [text(PASS_ICON)],
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
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
  definitions: Record<string, string>,
  githubServerUrl: string,
): TableCell["children"][] {
  addAccountOrRepoDef(definitions, githubServerUrl, result.request.requester);

  return [
    [text(FAIL_ICON)],
    [accountOrRepoLinkRef(result.request.requester)],
    [inlineCode(result.request.name)],
    targetCellChildren(result.request.to, definitions, githubServerUrl),
    [text(failureReason(result, tokenCreationResults, provisionResults))],
  ];
}

function targetCellChildren(
  targets: ProvisionRequestTarget[],
  definitions: Record<string, string>,
  githubServerUrl: string,
): TableCell["children"] {
  if (targets.length < 1) return [emphasis(text("(none)"))];

  const refs = new Map<string, AccountOrRepoReference>();

  for (const t of targets) {
    const identifier = addAccountOrRepoDef(
      definitions,
      githubServerUrl,
      t.target,
    );

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

function definitionsAst(definitions: Record<string, string>): RootContent[] {
  const entries = Object.entries(definitions).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const ast: RootContent[] = [];

  for (const [identifier, url] of entries) {
    ast.push({
      type: "definition",
      identifier,
      label: identifier,
      url,
      title: null,
    });
  }

  return ast;
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
): string {
  const slug = accountOrRepoRefToString(accountOrRepo).toLowerCase();
  const identifier = `${LINK_REF_PREFIX}${slug}`.toLowerCase();

  definitions[identifier] = new URL(slug, githubServerUrl).toString();

  return identifier;
}
