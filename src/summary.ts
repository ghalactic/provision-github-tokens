import type { RootContent, TableCell } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { AuthorizeResult } from "./authorizer.js";
import {
  accountOrRepoRefToString,
  type AccountOrRepoReference,
} from "./github-reference.js";
import {
  accountOrRepoDefinition,
  accountOrRepoLinkRef,
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

const MAX_ROWS = 1000;

export function renderSummary(
  githubServerUrl: string,
  actionUrl: string,
  authResult: AuthorizeResult,
  tokens: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): string {
  const { provisionResults: authResults } = authResult;
  const allDenied = authResults.filter(
    (r) => !isFullyProvisioned(r, provisionResults),
  );
  const allAllowed = authResults.filter((r) =>
    isFullyProvisioned(r, provisionResults),
  );

  const denied = allDenied.slice(0, MAX_ROWS);
  const remaining = Math.max(0, MAX_ROWS - denied.length);
  const allowed = allAllowed.slice(0, remaining);
  const displayed = [...denied, ...allowed];

  const omitted =
    allDenied.length - denied.length + (allAllowed.length - allowed.length);

  return toMarkdown(
    {
      type: "root",
      children: [
        statsHeading(authResults, provisionResults),
        ...emptySection(authResults, authResult, actionUrl),
        ...failuresTable(denied, tokens, provisionResults),
        ...successesTable(allowed),
        ...omittedNotice(authResults.length, omitted),
        ...definitions(githubServerUrl, displayed),
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
  const total = authResults.length;
  const allowed = authResults.filter((r) =>
    isFullyProvisioned(r, provisionResults),
  ).length;

  const headingText =
    allowed === total
      ? `Provisioned ${pluralize(total, "secret", "secrets")}`
      : `Provisioned ${allowed} of ${pluralize(total, "secret", "secrets")}`;

  return heading(3, text(headingText));
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
  denied: ProvisionAuthResult[],
  tokens: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): RootContent[] {
  if (denied.length === 0) return [];

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
      denied.map((r) => failureRow(r, tokens, provisionResults)),
    ),
  ];
}

function successesTable(allowed: ProvisionAuthResult[]): RootContent[] {
  if (allowed.length === 0) return [];

  return [
    table(
      ["left", "left", "left", "left"],
      [[], [text("Requester")], [text("Secret")], [text("Targets")]],
      allowed.map((r) => successRow(r)),
    ),
  ];
}

function omittedNotice(total: number, omitted: number): RootContent[] {
  if (omitted === 0) return [];

  return [
    gfmAlert(
      "IMPORTANT",
      paragraph(
        text(
          `Showing ${total - omitted} of ${total} secrets. ` +
            `Check the logs for the full list.`,
        ),
      ),
    ),
  ];
}

function successRow(result: ProvisionAuthResult): TableCell["children"][] {
  return [
    [text(renderIcon(true))],
    [accountOrRepoLinkRef(result.request.requester)],
    [inlineCode(result.request.name)],
    targetCellChildren(result.request.to),
  ];
}

function failureRow(
  result: ProvisionAuthResult,
  tokens: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): TableCell["children"][] {
  return [
    [text(renderIcon(false))],
    [accountOrRepoLinkRef(result.request.requester)],
    [inlineCode(result.request.name)],
    targetCellChildren(result.request.to),
    [text(failureReason(result, tokens, provisionResults))],
  ];
}

function failureReason(
  authResult: ProvisionAuthResult,
  tokens: Map<TokenAuthResult, TokenCreationResult>,
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
    if (!targetAuth.tokenAuthResult) continue;

    const tokenResult = tokens.get(targetAuth.tokenAuthResult);
    if (!tokenResult) continue;

    if (tokenResult.type === "NO_ISSUER") return "No suitable issuer";
    if (tokenResult.type === "REQUEST_ERROR" || tokenResult.type === "ERROR") {
      return "Failed to issue token";
    }
  }

  const targetResults = provisionResults.get(authResult);
  if (targetResults) {
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
  if (!targetResults || targetResults.size === 0) return false;

  for (const result of targetResults.values()) {
    if (result.type !== "PROVISIONED") return false;
  }

  return true;
}

function targetCellChildren(
  targets: ProvisionRequestTarget[],
): TableCell["children"] {
  const seen = new Set<string>();
  const refs: AccountOrRepoReference[] = [];

  for (const t of targets) {
    const key = accountOrRepoRefToString(t.target).toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      refs.push(t.target);
    }
  }

  refs.sort((a, b) =>
    accountOrRepoRefToString(a)
      .toLowerCase()
      .localeCompare(accountOrRepoRefToString(b).toLowerCase()),
  );

  const children: TableCell["children"] = [];

  for (let i = 0; i < refs.length; i++) {
    if (i > 0) children.push(text(", "));
    children.push(accountOrRepoLinkRef(refs[i]));
  }

  return children;
}

function definitions(
  githubServerUrl: string,
  provisionResults: ProvisionAuthResult[],
): RootContent[] {
  const seen = new Set<string>();
  const refs: AccountOrRepoReference[] = [];

  for (const r of provisionResults) {
    const requesterKey = accountOrRepoRefToString(
      r.request.requester,
    ).toLowerCase();

    if (!seen.has(requesterKey)) {
      seen.add(requesterKey);
      refs.push(r.request.requester);
    }

    for (const t of r.request.to) {
      const targetKey = accountOrRepoRefToString(t.target).toLowerCase();

      if (!seen.has(targetKey)) {
        seen.add(targetKey);
        refs.push(t.target);
      }
    }
  }

  refs.sort((a, b) =>
    accountOrRepoRefToString(a)
      .toLowerCase()
      .localeCompare(accountOrRepoRefToString(b).toLowerCase()),
  );

  return refs.map((ref) => accountOrRepoDefinition(githubServerUrl, ref));
}
