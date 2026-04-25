import type { Heading, ListItem, RootContent } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { AuthorizeResult } from "./authorizer.js";
import { compareProvisionRequest } from "./compare-provision-request.js";
import { compareTokenRequest } from "./compare-token-request.js";
import { repoRefToString } from "./github-reference.js";
import {
  anchorLink,
  emphasis,
  inlineCode,
  link,
  listItem,
  paragraph,
  renderIcon,
  text,
  unorderedList,
  type HeadingFactory,
} from "./markdown.js";
import { pluralize } from "./pluralize.js";
import { createMarkdownProvisionAuthExplainer } from "./provision-auth-explainer/markdown.js";
import { createMarkdownTokenAuthExplainer } from "./token-auth-explainer/markdown.js";
import type { ProvisionAuthResult } from "./type/provision-auth-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenHeadingReference } from "./type/token-heading-reference.js";

export function renderSummary(
  createHeading: HeadingFactory,
  result: AuthorizeResult,
  actionUrl: string,
): string {
  const provisionResults = result.provisionResults.toSorted((a, b) =>
    compareProvisionRequest(a.request, b.request),
  );
  const tokenResults = result.tokenResults.toSorted((a, b) =>
    compareTokenRequest(a.request, b.request),
  );

  const secretHeadingMap = buildSecretHeadingMap(
    createHeading,
    provisionResults,
  );
  const { tokenHeadingMap, tokenReferenceMap } = buildTokenMaps(
    createHeading,
    tokenResults,
  );
  const { secretTokenLinkMap, usedByMap } = buildSecretTokenRelations(
    provisionResults,
    secretHeadingMap,
    tokenReferenceMap,
  );

  const explainToken = createMarkdownTokenAuthExplainer();
  const explainProvision =
    createMarkdownProvisionAuthExplainer(tokenReferenceMap);

  return toMarkdown(
    {
      type: "root",
      children: [
        statsHeading(createHeading, provisionResults),
        ...emptySection(provisionResults, tokenResults, actionUrl),
        ...failuresSection(createHeading, provisionResults, secretHeadingMap),
        ...secretProvisioningSection(
          createHeading,
          provisionResults,
          explainProvision,
          secretTokenLinkMap,
          secretHeadingMap,
        ),
        ...tokenIssuingSection(
          createHeading,
          tokenResults,
          explainToken,
          tokenHeadingMap,
          usedByMap,
        ),
      ],
    },
    { bullet: "-", extensions: [gfmToMarkdown()] },
  );
}

function statsHeading(
  createHeading: HeadingFactory,
  provisionResults: ProvisionAuthResult[],
): Heading {
  const total = provisionResults.length;
  const allowed = provisionResults.filter((r) => r.isAllowed).length;

  const headingText =
    allowed === total
      ? `Provisioned ${pluralize(total, "secret", "secrets")}`
      : `Provisioned ${allowed} of ${pluralize(total, "secret", "secrets")}`;

  const [result] = createHeading(2, text(headingText));

  return result;
}

function emptySection(
  provisionResults: ProvisionAuthResult[],
  tokenResults: TokenAuthResult[],
  actionUrl: string,
): RootContent[] {
  if (provisionResults.length > 0 || tokenResults.length > 0) return [];

  return [
    paragraph(emphasis(text("(no secrets provisioned)"))),
    paragraph(
      text("Need help getting started? See the "),
      link(new URL("#readme", actionUrl), text("docs")),
      text("."),
    ),
  ];
}

function failuresSection(
  createHeading: HeadingFactory,
  provisionResults: ProvisionAuthResult[],
  secretHeadingMap: HeadingMap<ProvisionAuthResult>,
): RootContent[] {
  const failures = provisionResults.filter((r) => !r.isAllowed);
  if (failures.length === 0) return [];

  const [failuresHeading] = createHeading(3, text("Failures"));
  const nodes: RootContent[] = [failuresHeading];

  for (const [requesterName, group] of Map.groupBy(failures, (r) =>
    repoRefToString(r.request.requester),
  )) {
    const [requesterHeading] = createHeading(4, text(requesterName));
    nodes.push(requesterHeading);
    nodes.push(
      unorderedList(
        ...group.map((r) => {
          const secretHeading = secretHeadingMap.get(r);

          /* istanbul ignore next - @preserve */
          if (secretHeading == null) {
            throw new Error("Invariant violation: missing secret heading");
          }

          return listItem(
            paragraph(
              text(`${renderIcon(false)} `),
              anchorLink(secretHeading.id, inlineCode(r.request.name)),
            ),
          );
        }),
      ),
    );
  }

  return nodes;
}

function secretProvisioningSection(
  createHeading: HeadingFactory,
  provisionResults: ProvisionAuthResult[],
  explainProvision: (result: ProvisionAuthResult) => RootContent[],
  secretTokenLinkMap: Map<ProvisionAuthResult, TokenHeadingReference>,
  secretHeadingMap: HeadingMap<ProvisionAuthResult>,
): RootContent[] {
  if (provisionResults.length === 0) return [];

  const [secretProvisioningHeading] = createHeading(
    3,
    text("Secret provisioning"),
  );
  const nodes: RootContent[] = [secretProvisioningHeading];

  appendGroupedContent(
    createHeading,
    nodes,
    provisionResults,
    (r) => repoRefToString(r.request.requester),
    (result) => {
      const secretHeading = secretHeadingMap.get(result);

      /* istanbul ignore next - @preserve */
      if (secretHeading == null) {
        throw new Error("Invariant violation: missing secret heading");
      }

      return [
        secretHeading.heading,
        ...explainProvision(result),
        ...usesTokenLine(createHeading, result, secretTokenLinkMap),
      ];
    },
  );

  return nodes;
}

function tokenIssuingSection(
  createHeading: HeadingFactory,
  tokenResults: TokenAuthResult[],
  explainToken: (result: TokenAuthResult) => RootContent[],
  tokenHeadingMap: HeadingMap<TokenAuthResult>,
  usedByMap: Map<TokenAuthResult, UsedByEntry[]>,
): RootContent[] {
  if (tokenResults.length === 0) return [];

  const [tokenIssuingHeading] = createHeading(3, text("Token issuing"));
  const nodes: RootContent[] = [tokenIssuingHeading];

  appendGroupedContent(
    createHeading,
    nodes,
    tokenResults,
    (r) => consumerRefToString(r),
    (result) => {
      const tokenHeading = tokenHeadingMap.get(result);

      /* istanbul ignore next - @preserve */
      if (tokenHeading == null) {
        throw new Error("Invariant violation: missing token heading");
      }

      const usedBy = usedByMap.get(result);

      /* istanbul ignore next - @preserve */
      if (usedBy == null) {
        throw new Error("Invariant violation: missing used-by entries");
      }

      const [usedByHeading] = createHeading(6, text("Used by"));

      return [
        tokenHeading.heading,
        ...explainToken(result),
        usedByHeading,
        unorderedList(...usedBy.map((entry) => usedByItem(entry))),
      ];
    },
  );

  return nodes;
}

function tokenHeadingText(index: number, result: TokenAuthResult): string {
  const account = result.request.tokenDec.account;
  const n = `Token #${index}`;

  if (result.request.repos === "all") {
    return `${n} — ${account} (all repos)`;
  }

  if (result.request.repos.length === 0) {
    return `${n} — ${account} (no repos)`;
  }

  return (
    `${n} — ${account} ` +
    `(${pluralize(result.request.repos.length, "repo", "repos")})`
  );
}

function usesTokenLine(
  createHeading: HeadingFactory,
  result: ProvisionAuthResult,
  secretTokenLinkMap: Map<ProvisionAuthResult, TokenHeadingReference>,
): RootContent[] {
  const tokenReference = secretTokenLinkMap.get(result);
  if (!tokenReference) return [];

  const [usesHeading] = createHeading(
    6,
    text("Uses "),
    anchorLink(
      tokenReference.headingId,
      text(`token #${tokenReference.index}`),
    ),
  );

  return [usesHeading];
}

function buildTokenMaps(
  createHeading: HeadingFactory,
  tokenResults: TokenAuthResult[],
): {
  tokenHeadingMap: HeadingMap<TokenAuthResult>;
  tokenReferenceMap: Map<TokenAuthResult, TokenHeadingReference>;
} {
  const tokenHeadingMap: HeadingMap<TokenAuthResult> = new Map();
  const tokenReferenceMap = new Map<TokenAuthResult, TokenHeadingReference>();
  let tokenIndex = 1;

  for (const [consumerName, group] of Map.groupBy(tokenResults, (r) =>
    consumerRefToString(r),
  )) {
    void consumerName;

    for (const result of group) {
      const [node, id] = createHeading(
        5,
        text(tokenHeadingText(tokenIndex, result)),
      );
      tokenHeadingMap.set(result, { heading: node, id });
      tokenReferenceMap.set(result, { headingId: id, index: tokenIndex });
      tokenIndex += 1;
    }
  }

  return { tokenHeadingMap, tokenReferenceMap };
}

function buildSecretTokenRelations(
  provisionResults: ProvisionAuthResult[],
  secretHeadingMap: HeadingMap<ProvisionAuthResult>,
  tokenReferenceMap: Map<TokenAuthResult, TokenHeadingReference>,
): {
  secretTokenLinkMap: Map<ProvisionAuthResult, TokenHeadingReference>;
  usedByMap: Map<TokenAuthResult, UsedByEntry[]>;
} {
  const secretTokenLinkMap = new Map<
    ProvisionAuthResult,
    TokenHeadingReference
  >();
  const usedByMap = new Map<TokenAuthResult, UsedByEntry[]>();

  for (const provisionResult of provisionResults) {
    const requesterName = repoRefToString(provisionResult.request.requester);
    const secretHeading = secretHeadingMap.get(provisionResult);

    /* istanbul ignore next - @preserve */
    if (secretHeading == null) {
      throw new Error("Invariant violation: missing secret heading");
    }

    let tokenAuthResultForSecret: TokenAuthResult | undefined;

    for (const targetResult of provisionResult.results) {
      const { tokenAuthResult } = targetResult;
      if (!tokenAuthResult) continue;

      /* istanbul ignore else - @preserve */
      if (!tokenAuthResultForSecret) {
        tokenAuthResultForSecret = tokenAuthResult;
      } else if (tokenAuthResultForSecret !== tokenAuthResult) {
        throw new Error(
          "Invariant violation: multiple token auth results for secret",
        );
      }

      let entries = usedByMap.get(tokenAuthResult);
      if (!entries) {
        entries = [];
        usedByMap.set(tokenAuthResult, entries);
      }

      const anchor = secretHeading.id;
      if (!entries.some((entry) => entry.secretAnchor === anchor)) {
        entries.push({
          secretName: provisionResult.request.name,
          secretAnchor: anchor,
          requesterName,
        });
      }
    }

    if (!tokenAuthResultForSecret) continue;

    const tokenReference = tokenReferenceMap.get(tokenAuthResultForSecret);

    /* istanbul ignore next - @preserve */
    if (tokenReference == null) {
      throw new Error("Invariant violation: missing token reference");
    }

    secretTokenLinkMap.set(provisionResult, tokenReference);
  }

  return { secretTokenLinkMap, usedByMap };
}

function consumerRefToString(result: TokenAuthResult): string {
  const { consumer } = result.request;

  return "repo" in consumer
    ? `${consumer.account}/${consumer.repo}`
    : consumer.account;
}

function buildSecretHeadingMap(
  createHeading: HeadingFactory,
  provisionResults: ProvisionAuthResult[],
): HeadingMap<ProvisionAuthResult> {
  const map: HeadingMap<ProvisionAuthResult> = new Map();

  for (const [requesterName, group] of Map.groupBy(provisionResults, (r) =>
    repoRefToString(r.request.requester),
  )) {
    void requesterName;

    for (const result of group) {
      const [node, id] = createHeading(5, text(result.request.name));
      map.set(result, { heading: node, id });
    }
  }

  return map;
}

function appendGroupedContent<T>(
  createHeading: HeadingFactory,
  nodes: RootContent[],
  items: T[],
  key: (item: T) => string,
  renderItem: (item: T) => RootContent[],
): void {
  for (const [name, group] of Map.groupBy(items, (item) => key(item))) {
    const [groupHeading] = createHeading(4, text(name));

    nodes.push(groupHeading);
    for (const item of group) nodes.push(...renderItem(item));
  }
}

function usedByItem(entry: UsedByEntry): ListItem {
  return listItem(
    paragraph(
      anchorLink(entry.secretAnchor, inlineCode(entry.secretName)),
      text(` (${entry.requesterName})`),
    ),
  );
}

type UsedByEntry = {
  secretName: string;
  secretAnchor: string;
  requesterName: string;
};

type HeadingEntry = { heading: Heading; id: string };
type HeadingMap<T> = Map<T, HeadingEntry>;
