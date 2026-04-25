import type { Heading, ListItem, RootContent } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { AuthorizeResult } from "./authorizer.js";
import { compareProvisionRequest } from "./compare-provision-request.js";
import { compareTokenRequest } from "./compare-token-request.js";
import { repoRefFromName, repoRefToString } from "./github-reference.js";
import {
  accountOrRepoLink,
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
  githubServerURL: string,
  actionURL: string,
  result: AuthorizeResult,
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
    githubServerURL,
    tokenResults,
  );
  const { secretTokenLinkMap, usedByMap } = buildSecretTokenRelations(
    githubServerURL,
    provisionResults,
    secretHeadingMap,
    tokenReferenceMap,
  );

  const explainTokenAuth = createMarkdownTokenAuthExplainer(githubServerURL);
  const explainProvisionAuth = createMarkdownProvisionAuthExplainer(
    githubServerURL,
    tokenReferenceMap,
  );

  return toMarkdown(
    {
      type: "root",
      children: [
        statsHeading(createHeading, provisionResults),
        ...emptySection(provisionResults, tokenResults, actionURL),
        ...failuresSection(
          createHeading,
          githubServerURL,
          provisionResults,
          secretHeadingMap,
        ),
        ...secretProvisioningSection(
          createHeading,
          githubServerURL,
          provisionResults,
          explainProvisionAuth,
          secretTokenLinkMap,
          secretHeadingMap,
        ),
        ...tokenIssuingSection(
          createHeading,
          githubServerURL,
          tokenResults,
          explainTokenAuth,
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
  actionURL: string,
): RootContent[] {
  if (provisionResults.length > 0 || tokenResults.length > 0) return [];

  return [
    paragraph(emphasis(text("(no secrets provisioned)"))),
    paragraph(
      text("Need help getting started? See the "),
      link(new URL("#readme", actionURL), text("docs")),
      text("."),
    ),
  ];
}

function failuresSection(
  createHeading: HeadingFactory,
  githubServerURL: string,
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
    const [requesterHeading] = createHeading(
      4,
      accountOrRepoLink(githubServerURL, repoRefFromName(requesterName)),
    );
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
  githubServerURL: string,
  provisionResults: ProvisionAuthResult[],
  explainProvisionAuth: (result: ProvisionAuthResult) => RootContent[],
  secretTokenLinkMap: Map<ProvisionAuthResult, TokenHeadingReference>,
  secretHeadingMap: HeadingMap<ProvisionAuthResult>,
): RootContent[] {
  if (provisionResults.length === 0) return [];

  const [secretsHeading] = createHeading(3, text("Secrets"));
  const nodes: RootContent[] = [secretsHeading];

  for (const [requesterName, group] of Map.groupBy(provisionResults, (r) =>
    repoRefToString(r.request.requester),
  )) {
    const [requesterHeading] = createHeading(
      4,
      accountOrRepoLink(githubServerURL, repoRefFromName(requesterName)),
    );
    nodes.push(requesterHeading);

    for (const result of group) {
      const secretHeading = secretHeadingMap.get(result);

      /* istanbul ignore next - @preserve */
      if (secretHeading == null) {
        throw new Error("Invariant violation: missing secret heading");
      }

      nodes.push(secretHeading.heading);

      const [authHeading] = createHeading(6, text("Authorization result"));
      nodes.push(authHeading);
      nodes.push(...explainProvisionAuth(result));

      nodes.push(...usesTokenList(createHeading, result, secretTokenLinkMap));
    }
  }

  return nodes;
}

function tokenIssuingSection(
  createHeading: HeadingFactory,
  githubServerURL: string,
  tokenResults: TokenAuthResult[],
  explainTokenAuth: (result: TokenAuthResult) => RootContent[],
  tokenHeadingMap: HeadingMap<TokenAuthResult>,
  usedByMap: Map<TokenAuthResult, UsedByEntry[]>,
): RootContent[] {
  if (tokenResults.length === 0) return [];

  const [tokensHeading] = createHeading(3, text("Tokens"));
  const nodes: RootContent[] = [tokensHeading];

  for (const [consumerName, group] of Map.groupBy(tokenResults, (r) =>
    consumerRefToString(r),
  )) {
    const [consumerHeading] = createHeading(
      4,
      ...consumerHeadingChildren(githubServerURL, consumerName),
    );
    nodes.push(consumerHeading);

    for (const result of group) {
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

      nodes.push(tokenHeading.heading);

      const [authHeading] = createHeading(6, text("Authorization result"));
      nodes.push(authHeading);
      nodes.push(...explainTokenAuth(result));

      const [usedByHeading] = createHeading(6, text("Used by"));
      nodes.push(usedByHeading);
      nodes.push(unorderedList(...usedBy.map((entry) => usedByItem(entry))));
    }
  }

  return nodes;
}

function tokenHeadingChildren(
  githubServerURL: string,
  index: number,
  result: TokenAuthResult,
): Heading["children"] {
  const account = result.request.tokenDec.account;
  const n = `Token #${index}`;

  if (result.request.repos === "all") {
    return [
      text(`${n} - `),
      accountOrRepoLink(githubServerURL, { account }),
      text(" (all repos)"),
    ];
  }

  if (result.request.repos.length === 0) {
    return [
      text(`${n} - `),
      accountOrRepoLink(githubServerURL, { account }),
      text(" (no repos)"),
    ];
  }

  return [
    text(`${n} - `),
    accountOrRepoLink(githubServerURL, { account }),
    text(` (${pluralize(result.request.repos.length, "repo", "repos")})`),
  ];
}

function usesTokenList(
  createHeading: HeadingFactory,
  result: ProvisionAuthResult,
  secretTokenLinkMap: Map<ProvisionAuthResult, TokenHeadingReference>,
): RootContent[] {
  const tokenReference = secretTokenLinkMap.get(result);
  if (!tokenReference) return [];

  const [usesHeading] = createHeading(6, text("Uses"));

  const usesList = unorderedList(
    listItem(
      paragraph(
        anchorLink(
          tokenReference.headingId,
          text(`Token #${tokenReference.index}`),
        ),
      ),
    ),
  );

  return [usesHeading, usesList];
}

function buildTokenMaps(
  createHeading: HeadingFactory,
  githubServerURL: string,
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
        ...tokenHeadingChildren(githubServerURL, tokenIndex, result),
      );
      tokenHeadingMap.set(result, { heading: node, id });
      tokenReferenceMap.set(result, { headingId: id, index: tokenIndex });
      tokenIndex += 1;
    }
  }

  return { tokenHeadingMap, tokenReferenceMap };
}

function buildSecretTokenRelations(
  githubServerURL: string,
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
          githubServerURL,
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

function usedByItem(entry: UsedByEntry): ListItem {
  return listItem(
    paragraph(
      anchorLink(entry.secretAnchor, inlineCode(entry.secretName)),
      text(" ("),
      accountOrRepoLink(
        entry.githubServerURL,
        repoRefFromName(entry.requesterName),
      ),
      text(")"),
    ),
  );
}

type UsedByEntry = {
  githubServerURL: string;
  secretName: string;
  secretAnchor: string;
  requesterName: string;
};

function consumerHeadingChildren(
  githubServerURL: string,
  consumer: string,
): Heading["children"] {
  if (consumer.includes("/")) {
    return [accountOrRepoLink(githubServerURL, repoRefFromName(consumer))];
  }

  return [accountOrRepoLink(githubServerURL, { account: consumer })];
}

type HeadingEntry = { heading: Heading; id: string };
type HeadingMap<T> = Map<T, HeadingEntry>;
