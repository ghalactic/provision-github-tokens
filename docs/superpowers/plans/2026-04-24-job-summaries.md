# Job summaries implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub Actions job summaries that display a rich Markdown overview
of authorization results on the workflow run's summary page.

**Architecture:** A pure `renderSummary()` function builds an mdast AST from
`AuthorizeResult` data, renders it to Markdown via `mdast-util-to-markdown` with
GFM support, and returns the string. `main.ts` calls
`summary.addRaw(markdown).write()`. Two new markdown explainers
(`TokenAuthResultExplainer<RootContent[]>` and
`ProvisionAuthResultExplainer<RootContent[]>`) generate AST-native auth
breakdowns. File snapshot tests (`toMatchFileSnapshot()`) verify all Markdown
output.

**Tech Stack:** mdast / mdast-util-to-markdown / mdast-util-gfm / github-slugger
/ vitest file snapshots

---

## File structure

### New files

| File                                                  | Responsibility                                              |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| `src/summary.ts`                                      | `renderSummary()` — builds mdast AST and renders to string  |
| `src/token-auth-explainer/markdown.ts`                | Markdown token auth explainer — returns `RootContent[]`     |
| `src/provision-auth-explainer/markdown.ts`            | Markdown provision auth explainer — returns `RootContent[]` |
| `test/suite/unit/summary.spec.ts`                     | Tests for `renderSummary()`                                 |
| `test/suite/unit/token-auth-explainer/*.spec.ts`      | Tests for markdown token auth explainer                     |
| `test/suite/unit/provision-auth-explainer/*.spec.ts`  | Tests for markdown provision auth explainer                 |
| `test/fixture/summary/*/expected.md`                  | Snapshot fixtures for summary render tests                  |
| `test/fixture/token-auth-explainer/*/expected.md`     | Snapshot fixtures for token auth markdown tests             |
| `test/fixture/provision-auth-explainer/*/expected.md` | Snapshot fixtures for provision auth markdown tests         |

### Modified files

| File           | Change                                                           |
| -------------- | ---------------------------------------------------------------- |
| `src/main.ts`  | Capture `AuthorizeResult`, call `renderSummary()`, write summary |
| `package.json` | New dependencies (via `npm install`)                             |

---

## Task 1: Install dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install mdast-util-to-markdown mdast-util-gfm github-slugger
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D @types/mdast
```

- [ ] **Step 3: Verify installation**

Run: `npm ls mdast-util-to-markdown mdast-util-gfm github-slugger @types/mdast`

Expected: All four packages listed, no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add mdast and github-slugger dependencies

These will be used to build job summary Markdown from an AST.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Token auth markdown explainer

**Files:**

- Create: `src/token-auth-explainer/markdown.ts`
- Create: `test/suite/unit/token-auth-explainer/markdown.spec.ts`
- Create: `test/fixture/token-auth-explainer/` (multiple fixture directories)

### Context

The text token auth explainer (`src/token-auth-explainer/text.ts`) produces
indented plain text with ✅/❌ icons. The markdown version produces the same
logical structure as `RootContent[]` (mdast nodes). It must cover all three
`TokenAuthResult` discriminants: `ALL_REPOS`, `NO_REPOS`, `SELECTED_REPOS`.

The function signature mirrors the text explainer:

```typescript
export function createMarkdownTokenAuthExplainer(): TokenAuthResultExplainer<
  RootContent[]
>;
```

It returns a function `(result: TokenAuthResult) => RootContent[]`. The returned
nodes are unordered list(s) with nested sublists mirroring the text explainer's
indentation hierarchy.

### Implementation notes

Use this mdast structure for nested icon + text entries:

```typescript
import type { List, ListItem, Paragraph, RootContent, Text } from "mdast";

function iconItem(icon: string, text: string, children?: List): ListItem {
  const paragraph: Paragraph = {
    type: "paragraph",
    children: [{ type: "text", value: `${icon} ${text}` }],
  };

  return {
    type: "listItem",
    spread: false,
    children: children ? [paragraph, children] : [paragraph],
  };
}

function bulletList(...items: ListItem[]): List {
  return { type: "list", ordered: false, spread: false, children: items };
}
```

The explainer output for an `ALL_REPOS` allowed result should render to Markdown
like:

```markdown
- ✅ Account account-x was allowed access to a token:
  - ✅ Write access to all repos in account-a requested with role role-a
  - ✅ Sufficient access to all repos in account-a based on 1 rule:
    - ✅ Rule #1 gave sufficient access:
      - ✅ contents: have write, wanted write
```

Follow the exact same wording as the text explainer for each line. The only
difference is the output format (mdast nodes vs. indented text). Reference
`src/token-auth-explainer/text.ts` for every message string.

To render the `RootContent[]` to Markdown string for test assertions, use:

```typescript
import { toMarkdown } from "mdast-util-to-markdown";
import type { Root } from "mdast";

function renderNodes(nodes: RootContent[]): string {
  const root: Root = { type: "root", children: nodes };
  return toMarkdown(root);
}
```

- [ ] **Step 1: Write the test file with the first fixture**

Create `test/suite/unit/token-auth-explainer/markdown.spec.ts`:

```typescript
import { toMarkdown } from "mdast-util-to-markdown";
import type { Root, RootContent } from "mdast";
import { describe, expect, it } from "vitest";
import { createMarkdownTokenAuthExplainer } from "../../../../src/token-auth-explainer/markdown.js";
import { createTokenAuthorizer } from "../../../../src/token-authorizer.js";

function render(nodes: RootContent[]): string {
  const root: Root = { type: "root", children: nodes };

  return toMarkdown(root);
}

const explain = createMarkdownTokenAuthExplainer();

describe("ALL_REPOS", () => {
  it("explains an allowed token with a role", () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: true,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    });

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/token-auth-explainer/all-repos-allowed-with-role/expected.md",
    );
  });

  it("explains a denied token", () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: true,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "read" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    });

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/token-auth-explainer/all-repos-denied/expected.md",
    );
  });

  it("explains a token without a role", () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: true,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "write" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    });

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/token-auth-explainer/all-repos-allowed-without-role/expected.md",
    );
  });

  it("explains a token requested by a repo consumer", () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: true,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x/repo-x"],
          permissions: { contents: "write" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x", repo: "repo-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    });

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/token-auth-explainer/all-repos-repo-consumer/expected.md",
    );
  });

  it("explains a token with multiple rules", () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          description: "Read-only access",
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: true,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "read" },
        },
        {
          description: "Write access",
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: true,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    });

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/token-auth-explainer/all-repos-multiple-rules/expected.md",
    );
  });

  it("explains a token with multiple permissions", () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: true,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "write", metadata: "read", issues: "write" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { contents: "write", metadata: "read", issues: "write" },
      },
      repos: "all",
    });

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/token-auth-explainer/all-repos-multiple-permissions/expected.md",
    );
  });
});

describe("NO_REPOS", () => {
  it("explains an allowed no-repos token", () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: true,
              allRepos: false,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x"],
          permissions: { members: "read" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: [],
        permissions: { members: "read" },
      },
      repos: [],
    });

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/token-auth-explainer/no-repos-allowed/expected.md",
    );
  });

  it("explains a denied no-repos token", () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: true,
              allRepos: false,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x"],
          permissions: { members: "read" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: [],
        permissions: { members: "write" },
      },
      repos: [],
    });

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/token-auth-explainer/no-repos-denied/expected.md",
    );
  });
});

describe("SELECTED_REPOS", () => {
  it("explains an allowed selected-repos token", () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: false,
              selectedRepos: ["repo-*"],
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "write" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: ["repo-*"],
        permissions: { contents: "write" },
      },
      repos: ["repo-a", "repo-b"],
    });

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/token-auth-explainer/selected-repos-allowed/expected.md",
    );
  });

  it("explains a denied selected-repos token", () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: false,
              selectedRepos: ["repo-a"],
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "read" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: ["repo-*"],
        permissions: { contents: "write" },
      },
      repos: ["repo-a", "repo-b"],
    });

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/token-auth-explainer/selected-repos-denied/expected.md",
    );
  });

  it("explains a token with no matching rules", () => {
    const authorizer = createTokenAuthorizer({ rules: [] });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: ["repo-a"],
        permissions: { contents: "write" },
      },
      repos: ["repo-a"],
    });

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/token-auth-explainer/selected-repos-no-rules/expected.md",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
`npm exec -- vitest --run test/suite/unit/token-auth-explainer/markdown.spec.ts`

Expected: FAIL — `createMarkdownTokenAuthExplainer` does not exist.

- [ ] **Step 3: Implement the markdown token auth explainer**

Create `src/token-auth-explainer/markdown.ts`:

```typescript
import { isSufficientAccess } from "../access-level.js";
import { accountOrRepoRefToString, isRepoRef } from "../github-reference.js";
import { permissionAccess } from "../permissions.js";
import { pluralize } from "../pluralize.js";
import type { PermissionsRule } from "../type/permissions-rule.js";
import type { PermissionAccess, Permissions } from "../type/permissions.js";
import type {
  TokenAuthResourceResult,
  TokenAuthResourceResultRuleResult,
  TokenAuthResult,
  TokenAuthResultAllRepos,
  TokenAuthResultExplainer,
  TokenAuthResultNoRepos,
  TokenAuthResultSelectedRepos,
} from "../type/token-auth-result.js";
import type { List, ListItem, Paragraph, RootContent } from "mdast";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

const ACCESS_LEVELS: Record<PermissionAccess, string> = {
  none: "No",
  admin: "Admin",
  read: "Read",
  write: "Write",
};

export function createMarkdownTokenAuthExplainer(): TokenAuthResultExplainer<
  RootContent[]
> {
  return (result) => {
    if (result.type === "ALL_REPOS") return explainAllRepos(result);
    if (result.type === "NO_REPOS") return explainNoRepos(result);

    return explainSelectedRepos(result);
  };

  function explainAllRepos(result: TokenAuthResultAllRepos): RootContent[] {
    const { request, isSufficient, rules } = result;
    const subject = `all repos in ${request.tokenDec.account}`;

    return [
      bulletList(
        iconItem(icon(result.isAllowed), summaryText(result), [
          iconItem(
            icon(!result.isMissingRole),
            maxAccessAndRoleText(result, subject),
          ),
          iconItem(
            icon(isSufficient),
            `${isSufficient ? "Sufficient" : "Insufficient"} access to ${subject} ${basedOnRulesText(rules)}`,
            rulesSublist(request.tokenDec.permissions, rules),
          ),
        ]),
      ),
    ];
  }

  function explainNoRepos(result: TokenAuthResultNoRepos): RootContent[] {
    const { request, isSufficient, rules } = result;

    return [
      bulletList(
        iconItem(icon(result.isAllowed), summaryText(result), [
          iconItem(
            icon(!result.isMissingRole),
            maxAccessAndRoleText(result, request.tokenDec.account),
          ),
          iconItem(
            icon(isSufficient),
            `${isSufficient ? "Sufficient" : "Insufficient"} access to ${request.tokenDec.account} ${basedOnRulesText(rules)}`,
            rulesSublist(request.tokenDec.permissions, rules),
          ),
        ]),
      ),
    ];
  }

  function explainSelectedRepos(
    result: TokenAuthResultSelectedRepos,
  ): RootContent[] {
    const { request, results } = result;
    const subject = `repos in ${request.tokenDec.account}`;

    const resourceEntries = Object.entries(results).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    const repoItems: ListItem[] = [];
    for (const [resourceRepo, resourceResult] of resourceEntries) {
      repoItems.push(
        iconItem(
          icon(resourceResult.isSufficient),
          `${resourceResult.isSufficient ? "Sufficient" : "Insufficient"} access to repo ${resourceRepo} ${basedOnRulesText(resourceResult.rules)}`,
          rulesSublist(request.tokenDec.permissions, resourceResult.rules),
        ),
      );
    }

    const repoPatterns = pluralize(
      request.tokenDec.repos.length,
      "repo pattern",
      "repo patterns",
    );
    const repos = pluralize(request.repos.length, "repo", "repos");

    return [
      bulletList(
        iconItem(icon(result.isAllowed), summaryText(result), [
          iconItem(
            icon(!result.isMissingRole),
            maxAccessAndRoleText(result, subject),
          ),
          iconItem(icon(result.isMatched), `${repoPatterns} matched ${repos}`),
          ...repoItems,
        ]),
      ),
    ];
  }

  function summaryText({ request, isAllowed }: TokenAuthResult): string {
    const name = accountOrRepoRefToString(request.consumer);
    const kind = isRepoRef(request.consumer) ? "Repo" : "Account";

    return `${kind} ${name} was ${isAllowed ? "allowed" : "denied"} access to a token:`;
  }

  function maxAccessAndRoleText(
    { request, maxWant, isMissingRole }: TokenAuthResult,
    accessTo: string,
  ): string {
    return (
      `${ACCESS_LEVELS[maxWant]} access to ${accessTo} ` +
      (request.tokenDec.as
        ? `requested with role ${request.tokenDec.as}`
        : "requested without a role")
    );
  }

  function basedOnRulesText(
    rules: TokenAuthResourceResultRuleResult[],
  ): string {
    const ruleCount = rules.length;
    const ruleOrRules = ruleCount === 1 ? "rule" : "rules";

    if (ruleCount < 1) return "(no matching rules)";

    return `based on ${ruleCount} ${ruleOrRules}:`;
  }

  function rulesSublist(
    want: Permissions,
    rules: TokenAuthResourceResultRuleResult[],
  ): List | undefined {
    if (rules.length < 1) return undefined;

    return bulletList(...rules.map((ruleResult) => ruleItem(want, ruleResult)));
  }

  function ruleItem(
    want: Permissions,
    { index, rule, have, isSufficient }: TokenAuthResourceResultRuleResult,
  ): ListItem {
    const permItems: ListItem[] = [];

    for (const p of Object.keys(want).sort((a, b) => a.localeCompare(b))) {
      const h = permissionAccess(have, p);
      const w = permissionAccess(want, p);
      const sufficient = isSufficientAccess(h, w);

      permItems.push(
        iconItem(icon(sufficient), `${p}: have ${h}, wanted ${w}`),
      );
    }

    return iconItem(
      icon(isSufficient),
      `Rule ${renderRule(index, rule)} gave ${isSufficient ? "sufficient" : "insufficient"} access:`,
      permItems.length > 0 ? bulletList(...permItems) : undefined,
    );
  }

  function renderRule(index: number, { description }: PermissionsRule): string {
    const n = `#${index + 1}`;

    return description ? `${n}: ${JSON.stringify(description)}` : n;
  }

  function icon(isAllowed: boolean): string {
    return isAllowed ? ALLOWED_ICON : DENIED_ICON;
  }
}

function iconItem(
  iconStr: string,
  text: string,
  children?: ListItem[] | List,
): ListItem {
  const paragraph: Paragraph = {
    type: "paragraph",
    children: [{ type: "text", value: `${iconStr} ${text}` }],
  };
  const sublist: List | undefined = children
    ? Array.isArray(children) && "type" in children
      ? (children as List)
      : bulletList(...(children as ListItem[]))
    : undefined;

  return {
    type: "listItem",
    spread: false,
    children: sublist ? [paragraph, sublist] : [paragraph],
  };
}

function bulletList(...items: ListItem[]): List {
  return { type: "list", ordered: false, spread: false, children: items };
}
```

> **Note:** The `iconItem` helper at the bottom takes either a `List` or
> `ListItem[]` as children. This supports both direct `List` nodes (from
> `rulesSublist`) and arrays of items (from `explainSelectedRepos`). Adjust the
> overload if TypeScript complains — the simplest approach is to always pass a
> `List` node.

- [ ] **Step 4: Run the tests to generate snapshot files**

Run:
`npm exec -- vitest --run test/suite/unit/token-auth-explainer/markdown.spec.ts`

Expected: PASS — `toMatchFileSnapshot()` creates the `expected.md` files on
first run.

- [ ] **Step 5: Review the generated fixture files**

Check the generated files under `test/fixture/token-auth-explainer/`. Verify:

- Each `expected.md` contains Markdown unordered lists with ✅/❌ icons
- Nesting structure mirrors the text explainer's indentation
- Wording matches the text explainer exactly (same strings, same structure)
- Allowed/denied states are correct for each scenario

- [ ] **Step 6: Run make precommit**

Run: `make precommit`

Expected: All checks pass (lint, tests, type-check). Run `git status` afterwards
to see if any files were regenerated.

- [ ] **Step 7: Commit**

```bash
git add src/token-auth-explainer/markdown.ts \
  test/suite/unit/token-auth-explainer/markdown.spec.ts \
  test/fixture/token-auth-explainer/
git commit -m "Add markdown token auth explainer

Produces mdast AST nodes (RootContent[]) with the same logical
structure as the text explainer but formatted as nested Markdown
lists with ✅/❌ icons.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Provision auth markdown explainer

**Files:**

- Create: `src/provision-auth-explainer/markdown.ts`
- Create: `test/suite/unit/provision-auth-explainer/markdown.spec.ts`
- Create: `test/fixture/provision-auth-explainer/` (multiple fixture
  directories)

### Context

The text provision auth explainer (`src/provision-auth-explainer/text.ts`) takes
`tokenResults: TokenAuthResult[]` at creation time and references tokens by
index (`token #1`, `token #2`). The markdown version takes a
`Map<TokenAuthResult, string>` mapping each token result to its anchor ID, and
renders links to those anchors instead.

The function signature:

```typescript
export function createMarkdownProvisionAuthExplainer(
  tokenAnchorMap: Map<TokenAuthResult, string>,
): ProvisionAuthResultExplainer<RootContent[]>;
```

The output structure follows the text explainer. Each provision auth result
renders as an unordered list with:

1. Summary line: `✅ Repo account/repo was allowed to provision secret NAME:` or
   `❌ Repo account/repo wasn't allowed to provision secret NAME:`
2. Token declaration check: `✅ Can use token declaration ref` or
   `❌ Can't use token declaration ref because it isn't shared` /
   `it doesn't exist`
3. Target results (sorted by `compareProvisionRequestTarget`), each with:
   - Token auth link: `✅ Account name was allowed access to [token #N](anchor)`
     (with a Markdown link to the token anchor)
   - Provision rule check: `✅ Can provision secret based on N rules:` with
     sub-items for each rule
4. Missing targets: `❌ No targets specified`

### Implementation notes

For the token auth reference, the text explainer uses: `token ${ref}` where
`ref = #${tokenResults.indexOf(tokenAuthResult) + 1}`.

The markdown version uses an mdast link node:

```typescript
import type { Link, PhrasingContent } from "mdast";

// In explainTargetToken:
const anchor = tokenAnchorMap.get(tokenAuthResult) ?? "";
const ref = `token #${[...tokenAnchorMap.keys()].indexOf(tokenAuthResult) + 1}`;

// The link node:
const link: Link = {
  type: "link",
  url: `#${anchor}`,
  children: [{ type: "text", value: ref }],
};
```

This means the paragraph children for the token line need to use
`PhrasingContent[]` (text + link nodes) instead of a single `Text` node. You'll
need to split the `iconItem` helper or create a variant that accepts
`PhrasingContent[]`.

Add a helper like:

```typescript
function iconItemWithPhrasing(
  iconStr: string,
  phrasing: PhrasingContent[],
): ListItem {
  const paragraph: Paragraph = {
    type: "paragraph",
    children: [{ type: "text", value: `${iconStr} ` }, ...phrasing],
  };

  return { type: "listItem", spread: false, children: [paragraph] };
}
```

- [ ] **Step 1: Write the test file**

Create `test/suite/unit/provision-auth-explainer/markdown.spec.ts`:

```typescript
import { toMarkdown } from "mdast-util-to-markdown";
import type { Root, RootContent } from "mdast";
import { describe, expect, it } from "vitest";
import { compareTokenRequest } from "../../../../src/compare-token-request.js";
import { createMarkdownProvisionAuthExplainer } from "../../../../src/provision-auth-explainer/markdown.js";
import { createProvisionAuthorizer } from "../../../../src/provision-authorizer.js";
import type { TokenAuthResult } from "../../../../src/type/token-auth-result.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../../../declaration.js";
import { createTestTokenAuthorizer } from "../../../token-authorizer.js";
import { createTestTokenRequestFactory } from "../../../token-request.js";

function render(nodes: RootContent[]): string {
  const root: Root = { type: "root", children: nodes };

  return toMarkdown(root);
}

function createAnchorMap(
  tokenResults: TokenAuthResult[],
): Map<TokenAuthResult, string> {
  const map = new Map<TokenAuthResult, string>();
  for (let i = 0; i < tokenResults.length; i++) {
    map.set(tokenResults[i], `pgt-test-token-${i + 1}`);
  }

  return map;
}

describe("allowed secrets", () => {
  it("explains an allowed actions secret", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    const result = authorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));
    const anchorMap = createAnchorMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/provision-auth-explainer/actions-allowed/expected.md",
    );
  });

  it("explains an allowed environment secret", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: {},
                  repo: { environments: {} },
                  repos: {
                    "account-a/repo-a": {
                      environments: { production: "allow" },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    );

    const result = authorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "environment",
          target: {
            account: "account-a",
            repo: "repo-a",
            environment: "production",
          },
        },
      ],
    });

    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));
    const anchorMap = createAnchorMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/provision-auth-explainer/environment-allowed/expected.md",
    );
  });
});

describe("denied secrets", () => {
  it("explains a denied secret with insufficient token access", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "deny" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    const result = authorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec({ permissions: { contents: "admin" } }),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));
    const anchorMap = createAnchorMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/provision-auth-explainer/actions-denied/expected.md",
    );
  });

  it("explains a secret with a missing token declaration", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    const result = authorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: undefined,
      tokenDecIsRegistered: false,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));
    const anchorMap = createAnchorMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/provision-auth-explainer/missing-token-dec/expected.md",
    );
  });

  it("explains a secret with a non-shared token declaration", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    const result = authorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: undefined,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));
    const anchorMap = createAnchorMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/provision-auth-explainer/non-shared-token-dec/expected.md",
    );
  });

  it("explains a secret with missing targets", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      { rules: { secrets: [] } },
    );

    const result = authorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [],
    });

    const anchorMap = createAnchorMap([]);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/provision-auth-explainer/missing-targets/expected.md",
    );
  });
});

describe("multiple targets", () => {
  it("explains a secret with multiple target types", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {
                    "account-a/repo-a": {
                      actions: "allow",
                      codespaces: "allow",
                      dependabot: "allow",
                      environments: { staging: "allow" },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    );

    const result = authorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a", repo: "repo-a" },
        },
        {
          platform: "github",
          type: "codespaces",
          target: { account: "account-a", repo: "repo-a" },
        },
        {
          platform: "github",
          type: "dependabot",
          target: { account: "account-a", repo: "repo-a" },
        },
        {
          platform: "github",
          type: "environment",
          target: {
            account: "account-a",
            repo: "repo-a",
            environment: "staging",
          },
        },
      ],
    });

    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));
    const anchorMap = createAnchorMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    expect(render(explain(result))).toMatchFileSnapshot(
      "../../../fixture/provision-auth-explainer/multiple-targets/expected.md",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
`npm exec -- vitest --run test/suite/unit/provision-auth-explainer/markdown.spec.ts`

Expected: FAIL — `createMarkdownProvisionAuthExplainer` does not exist.

- [ ] **Step 3: Implement the markdown provision auth explainer**

Create `src/provision-auth-explainer/markdown.ts`:

```typescript
import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import {
  accountOrRepoRefToString,
  isRepoRef,
  repoRefToString,
} from "../github-reference.js";
import type { ProvisionRequestTarget } from "../provision-request.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthResultExplainer,
  ProvisionAuthTargetResult,
  ProvisionAuthTargetRuleResult,
} from "../type/provision-auth-result.js";
import type { ProvisionSecretsRule } from "../type/provision-rule.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";
import type {
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  RootContent,
} from "mdast";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function createMarkdownProvisionAuthExplainer(
  tokenAnchorMap: Map<TokenAuthResult, string>,
): ProvisionAuthResultExplainer<RootContent[]> {
  return (result) => {
    return [
      bulletList(
        iconItem(icon(result.isAllowed), summaryText(result), [
          tokenDecItem(result),
          ...targetItems(result),
        ]),
      ),
    ];
  };

  function summaryText({ request, isAllowed }: ProvisionAuthResult): string {
    return (
      `Repo ${repoRefToString(request.requester)} ` +
      (isAllowed ? "was allowed" : "wasn't allowed") +
      ` to provision secret ${request.name}:`
    );
  }

  function tokenDecItem(result: ProvisionAuthResult): ListItem {
    const { request } = result;
    const { secretDec, tokenDec, tokenDecIsRegistered } = request;

    if (tokenDec) {
      return iconItem(
        ALLOWED_ICON,
        `Can use token declaration ${secretDec.token}`,
      );
    }

    return iconItem(
      DENIED_ICON,
      `Can't use token declaration ${secretDec.token} because ` +
        (tokenDecIsRegistered ? "it isn't shared" : "it doesn't exist"),
    );
  }

  function targetItems(result: ProvisionAuthResult): ListItem[] {
    const { request, results, isMissingTargets } = result;

    if (isMissingTargets) {
      return [iconItem(DENIED_ICON, "No targets specified")];
    }

    const entries: [ProvisionRequestTarget, ProvisionAuthTargetResult][] = [];
    for (let i = 0; i < results.length; ++i) {
      entries.push([request.to[i], results[i]]);
    }
    entries.sort(([a], [b]) => compareProvisionRequestTarget(a, b));

    return entries.map(([target, targetResult]) =>
      targetItem(target, targetResult),
    );
  }

  function targetItem(
    target: ProvisionRequestTarget,
    result: ProvisionAuthTargetResult,
  ): ListItem {
    return iconItem(
      icon(result.isAllowed),
      `${result.isAllowed ? "Can" : "Can't"} provision token to ${subjectText(target)}:`,
      [tokenAuthItem(result), provisioningItem(result)],
    );
  }

  function tokenAuthItem(result: ProvisionAuthTargetResult): ListItem {
    const { isTokenAllowed, tokenAuthResult } = result;

    if (!tokenAuthResult) {
      return iconItem(
        DENIED_ICON,
        "Token can't be authorized without a declaration",
      );
    }

    const name = accountOrRepoRefToString(tokenAuthResult.request.consumer);
    const kind = isRepoRef(tokenAuthResult.request.consumer)
      ? "Repo"
      : "Account";
    const anchor = tokenAnchorMap.get(tokenAuthResult) ?? "";
    const tokenIndex = [...tokenAnchorMap.keys()].indexOf(tokenAuthResult) + 1;

    return iconItemWithLink(
      icon(isTokenAllowed),
      `${kind} ${name} was ${isTokenAllowed ? "allowed" : "denied"} access to `,
      `token #${tokenIndex}`,
      `#${anchor}`,
    );
  }

  function provisioningItem(result: ProvisionAuthTargetResult): ListItem {
    const { isProvisionAllowed, rules } = result;

    return iconItem(
      icon(isProvisionAllowed),
      `${isProvisionAllowed ? "Can" : "Can't"} provision secret ${basedOnRulesText(rules)}`,
      rulesSublist(rules),
    );
  }

  function basedOnRulesText(rules: ProvisionAuthTargetRuleResult[]): string {
    const ruleCount = rules.length;
    const ruleOrRules = ruleCount === 1 ? "rule" : "rules";

    if (ruleCount < 1) return "(no matching rules)";

    return `based on ${ruleCount} ${ruleOrRules}:`;
  }

  function rulesSublist(
    rules: ProvisionAuthTargetRuleResult[],
  ): List | undefined {
    if (rules.length < 1) return undefined;

    return bulletList(
      ...rules.map(({ index, rule, have }) => {
        const isAllowed = have === "allow";

        return iconItem(
          icon(isAllowed),
          `${isAllowed ? "Allowed" : "Denied"} by rule ${renderRule(index, rule)}`,
        );
      }),
    );
  }

  function subjectText(target: ProvisionRequestTarget): string {
    const type = ((r) => {
      const type = r.type;

      switch (type) {
        case "actions":
          return "GitHub Actions";
        case "codespaces":
          return "GitHub Codespaces";
        case "dependabot":
          return "Dependabot";
        case "environment":
          return `GitHub environment ${r.target.environment}`;
      }

      /* istanbul ignore next - @preserve */
      throw new Error(
        `Invariant violation: Unexpected secret type ${JSON.stringify(type)}`,
      );
    })(target);

    return `${type} secret in ${accountOrRepoRefToString(target.target)}`;
  }

  function renderRule(
    index: number,
    { description }: ProvisionSecretsRule,
  ): string {
    const n = `#${index + 1}`;

    return description ? `${n}: ${JSON.stringify(description)}` : n;
  }

  function icon(isAllowed: boolean): string {
    return isAllowed ? ALLOWED_ICON : DENIED_ICON;
  }
}

function iconItem(
  iconStr: string,
  text: string,
  children?: ListItem[] | List,
): ListItem {
  const paragraph: Paragraph = {
    type: "paragraph",
    children: [{ type: "text", value: `${iconStr} ${text}` }],
  };
  const sublist: List | undefined = children
    ? Array.isArray(children) && !("type" in children)
      ? bulletList(...(children as ListItem[]))
      : (children as List)
    : undefined;

  return {
    type: "listItem",
    spread: false,
    children: sublist ? [paragraph, sublist] : [paragraph],
  };
}

function iconItemWithLink(
  iconStr: string,
  textBefore: string,
  linkText: string,
  linkUrl: string,
): ListItem {
  const link: Link = {
    type: "link",
    url: linkUrl,
    children: [{ type: "text", value: linkText }],
  };
  const phrasing: PhrasingContent[] = [
    { type: "text", value: `${iconStr} ${textBefore}` },
    link,
  ];
  const paragraph: Paragraph = { type: "paragraph", children: phrasing };

  return { type: "listItem", spread: false, children: [paragraph] };
}

function bulletList(...items: ListItem[]): List {
  return { type: "list", ordered: false, spread: false, children: items };
}
```

- [ ] **Step 4: Run the tests to generate snapshot files**

Run:
`npm exec -- vitest --run test/suite/unit/provision-auth-explainer/markdown.spec.ts`

Expected: PASS — snapshot files created.

- [ ] **Step 5: Review the generated fixture files**

Check the files under `test/fixture/provision-auth-explainer/`. Verify:

- Token references appear as Markdown links: `[token #1](#pgt-test-token-1)`
- Environment target subjects include the environment name
- Missing token declaration / non-shared messages are correct
- Missing targets message is correct
- Multiple targets are sorted correctly

- [ ] **Step 6: Run make precommit**

Run: `make precommit`

Expected: All checks pass (lint, tests, type-check). Run `git status` afterwards
to see if any files were regenerated.

- [ ] **Step 7: Commit**

```bash
git add src/provision-auth-explainer/markdown.ts \
  test/suite/unit/provision-auth-explainer/markdown.spec.ts \
  test/fixture/provision-auth-explainer/
git commit -m "Add markdown provision auth explainer

Produces mdast AST nodes for provision authorization breakdowns.
Token references are rendered as Markdown links to anchor IDs
instead of plain text references.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Summary renderer

**Files:**

- Create: `src/summary.ts`
- Create: `test/suite/unit/summary.spec.ts`
- Create: `test/fixture/summary/` (multiple fixture directories)

### Context

The `renderSummary()` function takes `AuthorizeResult` and an anchor prefix
string, builds a full mdast AST, and renders it to a Markdown string. It uses
both markdown explainers from tasks 2 and 3.

The function signature:

```typescript
import type { AuthorizeResult } from "./authorizer.js";

export function renderSummary(result: AuthorizeResult, prefix: string): string;
```

### Structure of the rendered Markdown

```markdown
### Provisioned 47 of 50 secrets

### Failures

#### owner/requester-repo-a

- ❌ [`SECRET_NAME`](#pgt-prefix-owner-requester-repo-a--secret-name)

### Secret provisioning

#### owner/requester-repo

##### SECRET_NAME

<a id="pgt-prefix-owner-requester-repo--secret-name"></a>

<details>
<summary>❌ Not provisioned — 2 of 3 targets denied</summary>

(provision auth explainer output)

</details>

### Token issuing

#### owner/consumer-repo

##### Token for account-a (all repos)

<a id="pgt-prefix-token-1"></a>

Used by:

- [`SECRET_A`](#pgt-prefix-owner-requester-repo--secret-a)
  (owner/requester-repo)

<details>
<summary>✅ Allowed — write access</summary>

(token auth explainer output)

</details>
```

### Implementation notes

**Slugs and anchors:**

Use `github-slugger` for generating URL-safe slugs:

```typescript
import GithubSlugger from "github-slugger";

const slugger = new GithubSlugger();
```

Secret anchor: `${prefix}-${slugger.slug(`${requesterName}--${secretName}`)}`
Token anchor: `${prefix}-token-${index + 1}`

**`<details>` and `<a>` in mdast:**

Since mdast doesn't have native `<details>` or `<a id>` nodes, use HTML nodes:

```typescript
import type { Html } from "mdast";

const html: Html = { type: "html", value: `<a id="${anchorId}"></a>` };
const detailsOpen: Html = {
  type: "html",
  value: `<details>\n<summary>${summaryText}</summary>`,
};
const detailsClose: Html = { type: "html", value: "</details>" };
```

The content between `detailsOpen` and `detailsClose` is regular mdast content
that gets rendered to Markdown.

**Stats heading logic:**

```typescript
const totalSecrets = provisionResults.length;
const allowedSecrets = provisionResults.filter((r) => r.isAllowed).length;
const secretWord = totalSecrets === 1 ? "secret" : "secrets";

const heading =
  allowedSecrets === totalSecrets
    ? `Provisioned ${pluralize(totalSecrets, "secret", "secrets")}`
    : `Provisioned ${allowedSecrets} of ${pluralize(totalSecrets, "secret", "secrets")}`;
```

**Token heading logic:**

```typescript
function tokenHeading(request: TokenRequest): string {
  const account = request.tokenDec.account;

  if (request.repos === "all") return `Token for ${account} (all repos)`;
  if (request.repos.length === 0) return `Token for ${account} (no repos)`;

  return `Token for ${account} (${pluralize(request.repos.length, "repo", "repos")})`;
}
```

**Details summary logic for secrets:**

```typescript
function secretDetailsSummary(result: ProvisionAuthResult): string {
  const { results, isAllowed, isMissingTargets } = result;

  if (isMissingTargets) return "❌ Not provisioned — no targets";

  const totalTargets = results.length;
  const deniedTargets = results.filter((r) => !r.isAllowed).length;

  if (isAllowed) {
    return `✅ Provisioned to ${pluralize(totalTargets, "target", "targets")}`;
  }

  return `❌ Not provisioned — ${pluralize(deniedTargets, "target", "targets")} denied`;
}
```

**Details summary logic for tokens:**

```typescript
function tokenDetailsSummary(result: TokenAuthResult): string {
  if (result.isAllowed) {
    const level =
      result.maxWant === "admin"
        ? "admin"
        : result.maxWant === "write"
          ? "write"
          : "read";

    return `✅ Allowed — ${level} access`;
  }

  return "❌ Denied";
}
```

**"Used by" reverse mapping:**

Build the reverse mapping before rendering by iterating all provision results:

```typescript
const usedByMap = new Map<TokenAuthResult, UsedByEntry[]>();

type UsedByEntry = {
  secretName: string;
  secretAnchor: string;
  requesterName: string;
};

for (const provResult of provisionResults) {
  const requesterName = repoRefToString(provResult.request.requester);

  for (const targetResult of provResult.results) {
    if (!targetResult.tokenAuthResult) continue;

    const entries = usedByMap.get(targetResult.tokenAuthResult) ?? [];
    usedByMap.set(targetResult.tokenAuthResult, entries);

    const secretAnchor = secretAnchorId(
      prefix,
      requesterName,
      provResult.request.name,
    );

    // Avoid duplicate entries (same secret can have multiple targets)
    if (!entries.some((e) => e.secretAnchor === secretAnchor)) {
      entries.push({
        secretName: provResult.request.name,
        secretAnchor,
        requesterName,
      });
    }
  }
}
```

**Grouping by requester/consumer:**

Provision results are already sorted by `compareProvisionRequest` (requester
first). Group consecutive results with the same requester:

```typescript
function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const groups: [string, T[]][] = [];
  let currentKey = "";
  let currentGroup: T[] = [];

  for (const item of items) {
    const k = key(item);
    if (k !== currentKey) {
      if (currentGroup.length > 0) groups.push([currentKey, currentGroup]);
      currentKey = k;
      currentGroup = [item];
    } else {
      currentGroup.push(item);
    }
  }

  if (currentGroup.length > 0) groups.push([currentKey, currentGroup]);

  return groups;
}
```

Token results are sorted by `compareTokenRequest` (consumer first). Group the
same way.

- [ ] **Step 1: Write the test file**

Create `test/suite/unit/summary.spec.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { compareProvisionRequest } from "../../../src/compare-provision-request.js";
import { compareTokenRequest } from "../../../src/compare-token-request.js";
import { createProvisionAuthorizer } from "../../../src/provision-authorizer.js";
import { renderSummary } from "../../../src/summary.js";
import { createTestSecretDec, createTestTokenDec } from "../../declaration.js";
import { createTestTokenAuthorizer } from "../../token-authorizer.js";
import { createTestTokenRequestFactory } from "../../token-request.js";

describe("renderSummary", () => {
  it("renders a summary with all secrets provisioned", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_*"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });
    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_B",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot("../../fixture/summary/all-provisioned/expected.md");
  });

  it("renders a summary with some secrets denied", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });
    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_B",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot("../../fixture/summary/some-denied/expected.md");
  });

  it("renders a summary with all secrets denied", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      { rules: { secrets: [] } },
    );

    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec({ permissions: { contents: "admin" } }),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot("../../fixture/summary/all-denied/expected.md");
  });

  it("renders a summary with no secrets requested", () => {
    expect(
      renderSummary({ provisionResults: [], tokenResults: [] }, "pgt-test"),
    ).toMatchFileSnapshot("../../fixture/summary/empty/expected.md");
  });

  it("renders a summary with a single secret", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot("../../fixture/summary/single-secret/expected.md");
  });

  it("renders a summary with environment targets", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: {},
                  repo: { environments: {} },
                  repos: {
                    "account-a/repo-a": {
                      actions: "allow",
                      environments: { production: "allow", staging: "allow" },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a", repo: "repo-a" },
        },
        {
          platform: "github",
          type: "environment",
          target: {
            account: "account-a",
            repo: "repo-a",
            environment: "production",
          },
        },
        {
          platform: "github",
          type: "environment",
          target: {
            account: "account-a",
            repo: "repo-a",
            environment: "staging",
          },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot(
      "../../fixture/summary/environment-targets/expected.md",
    );
  });

  it("renders a summary with multiple requesters and consumers", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_*"],
              requesters: ["account-x/*", "account-y/*"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });
    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-y", repo: "repo-y" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_B",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot(
      "../../fixture/summary/multiple-requesters/expected.md",
    );
  });

  it("renders a summary with selected-repos and no-repos tokens", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
      members: "read",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_*"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec({
        repos: ["repo-*"],
        permissions: { contents: "write" },
      }),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_SELECTED",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });
    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec({
        repos: [],
        permissions: { members: "read" },
      }),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_NO_REPOS",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot(
      "../../fixture/summary/selected-and-no-repos/expected.md",
    );
  });

  it("renders a summary with a token with a role", () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec({ as: "deployer" }),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot("../../fixture/summary/token-with-role/expected.md");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm exec -- vitest --run test/suite/unit/summary.spec.ts`

Expected: FAIL — `renderSummary` does not exist.

- [ ] **Step 3: Implement the summary renderer**

Create `src/summary.ts`. This is the largest file in the feature — it
orchestrates the markdown explainers and builds the overall document structure.

```typescript
import GithubSlugger from "github-slugger";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type {
  Heading,
  Html,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
} from "mdast";
import type { AuthorizeResult } from "./authorizer.js";
import { compareProvisionRequest } from "./compare-provision-request.js";
import { compareTokenRequest } from "./compare-token-request.js";
import { repoRefToString } from "./github-reference.js";
import { pluralize } from "./pluralize.js";
import { createMarkdownProvisionAuthExplainer } from "./provision-auth-explainer/markdown.js";
import type { ProvisionAuthResult } from "./type/provision-auth-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import { createMarkdownTokenAuthExplainer } from "./token-auth-explainer/markdown.js";

type UsedByEntry = {
  secretName: string;
  secretAnchor: string;
  requesterName: string;
};

export function renderSummary(result: AuthorizeResult, prefix: string): string {
  const slugger = new GithubSlugger();

  const provisionResults = [...result.provisionResults].sort((a, b) =>
    compareProvisionRequest(a.request, b.request),
  );
  const tokenResults = [...result.tokenResults].sort((a, b) =>
    compareTokenRequest(a.request, b.request),
  );

  const tokenAnchorMap = buildTokenAnchorMap(tokenResults, prefix);
  const usedByMap = buildUsedByMap(provisionResults, prefix, slugger);

  const explainToken = createMarkdownTokenAuthExplainer();
  const explainProvision = createMarkdownProvisionAuthExplainer(tokenAnchorMap);

  const children: RootContent[] = [
    statsHeading(provisionResults),
    ...failuresSection(provisionResults, prefix, slugger),
    ...secretProvisioningSection(
      provisionResults,
      explainProvision,
      prefix,
      slugger,
    ),
    ...tokenIssuingSection(
      tokenResults,
      explainToken,
      tokenAnchorMap,
      usedByMap,
    ),
  ];

  const root: Root = { type: "root", children };

  return toMarkdown(root, { extensions: [gfmToMarkdown()] });
}

function statsHeading(provisionResults: ProvisionAuthResult[]): Heading {
  const total = provisionResults.length;
  const allowed = provisionResults.filter((r) => r.isAllowed).length;

  const text =
    allowed === total
      ? `Provisioned ${pluralize(total, "secret", "secrets")}`
      : `Provisioned ${allowed} of ${pluralize(total, "secret", "secrets")}`;

  return heading(3, text);
}

function failuresSection(
  provisionResults: ProvisionAuthResult[],
  prefix: string,
  slugger: GithubSlugger,
): RootContent[] {
  const failures = provisionResults.filter((r) => !r.isAllowed);
  if (failures.length === 0) return [];

  const nodes: RootContent[] = [heading(3, "Failures")];

  for (const [requesterName, group] of groupBy(failures, (r) =>
    repoRefToString(r.request.requester),
  )) {
    nodes.push(heading(4, requesterName));
    nodes.push(
      bulletList(
        ...group.map((r) => {
          const anchor = secretAnchorId(
            prefix,
            requesterName,
            r.request.name,
            slugger,
          );

          return linkItem(`❌ `, r.request.name, `#${anchor}`);
        }),
      ),
    );
  }

  return nodes;
}

function secretProvisioningSection(
  provisionResults: ProvisionAuthResult[],
  explainProvision: (result: ProvisionAuthResult) => RootContent[],
  prefix: string,
  slugger: GithubSlugger,
): RootContent[] {
  if (provisionResults.length === 0) return [];

  const nodes: RootContent[] = [heading(3, "Secret provisioning")];

  for (const [requesterName, group] of groupBy(provisionResults, (r) =>
    repoRefToString(r.request.requester),
  )) {
    nodes.push(heading(4, requesterName));

    for (const result of group) {
      const anchor = secretAnchorId(
        prefix,
        requesterName,
        result.request.name,
        slugger,
      );

      nodes.push(heading(5, result.request.name));
      nodes.push(html(`<a id="${anchor}"></a>`));
      nodes.push(
        html(`<details>\n<summary>${secretDetailsSummary(result)}</summary>`),
      );
      nodes.push(...explainProvision(result));
      nodes.push(html("</details>"));
    }
  }

  return nodes;
}

function tokenIssuingSection(
  tokenResults: TokenAuthResult[],
  explainToken: (result: TokenAuthResult) => RootContent[],
  tokenAnchorMap: Map<TokenAuthResult, string>,
  usedByMap: Map<TokenAuthResult, UsedByEntry[]>,
): RootContent[] {
  if (tokenResults.length === 0) return [];

  const nodes: RootContent[] = [heading(3, "Token issuing")];

  for (const [consumerName, group] of groupBy(tokenResults, (r) =>
    consumerRefToString(r),
  )) {
    nodes.push(heading(4, consumerName));

    for (const result of group) {
      const anchor = tokenAnchorMap.get(result) ?? "";

      nodes.push(heading(5, tokenHeadingText(result)));
      nodes.push(html(`<a id="${anchor}"></a>`));

      const usedBy = usedByMap.get(result) ?? [];
      if (usedBy.length > 0) {
        nodes.push(paragraph("Used by:"));
        nodes.push(bulletList(...usedBy.map((entry) => usedByItem(entry))));
      }

      nodes.push(
        html(`<details>\n<summary>${tokenDetailsSummary(result)}</summary>`),
      );
      nodes.push(...explainToken(result));
      nodes.push(html("</details>"));
    }
  }

  return nodes;
}

function secretDetailsSummary(result: ProvisionAuthResult): string {
  const { results, isAllowed, isMissingTargets } = result;

  if (isMissingTargets) return "❌ Not provisioned — no targets";

  const totalTargets = results.length;
  const deniedTargets = results.filter((r) => !r.isAllowed).length;

  if (isAllowed) {
    return `✅ Provisioned to ${pluralize(totalTargets, "target", "targets")}`;
  }

  return `❌ Not provisioned — ${pluralize(deniedTargets, "target", "targets")} denied`;
}

function tokenDetailsSummary(result: TokenAuthResult): string {
  if (result.isAllowed) {
    const level =
      result.maxWant === "admin"
        ? "admin"
        : result.maxWant === "write"
          ? "write"
          : "read";

    return `✅ Allowed — ${level} access`;
  }

  return "❌ Denied";
}

function tokenHeadingText(result: TokenAuthResult): string {
  const account = result.request.tokenDec.account;

  if (result.request.repos === "all") {
    return `Token for ${account} (all repos)`;
  }

  if (result.request.repos.length === 0) {
    return `Token for ${account} (no repos)`;
  }

  return `Token for ${account} (${pluralize(result.request.repos.length, "repo", "repos")})`;
}

function consumerRefToString(result: TokenAuthResult): string {
  const { consumer } = result.request;

  return "repo" in consumer
    ? `${consumer.account}/${consumer.repo}`
    : consumer.account;
}

function buildTokenAnchorMap(
  tokenResults: TokenAuthResult[],
  prefix: string,
): Map<TokenAuthResult, string> {
  const map = new Map<TokenAuthResult, string>();

  for (let i = 0; i < tokenResults.length; i++) {
    map.set(tokenResults[i], `${prefix}-token-${i + 1}`);
  }

  return map;
}

function buildUsedByMap(
  provisionResults: ProvisionAuthResult[],
  prefix: string,
  slugger: GithubSlugger,
): Map<TokenAuthResult, UsedByEntry[]> {
  const map = new Map<TokenAuthResult, UsedByEntry[]>();

  for (const provResult of provisionResults) {
    const requesterName = repoRefToString(provResult.request.requester);

    for (const targetResult of provResult.results) {
      if (!targetResult.tokenAuthResult) continue;

      let entries = map.get(targetResult.tokenAuthResult);
      if (!entries) {
        entries = [];
        map.set(targetResult.tokenAuthResult, entries);
      }

      const anchor = secretAnchorId(
        prefix,
        requesterName,
        provResult.request.name,
        slugger,
      );

      if (!entries.some((e) => e.secretAnchor === anchor)) {
        entries.push({
          secretName: provResult.request.name,
          secretAnchor: anchor,
          requesterName,
        });
      }
    }
  }

  return map;
}

function secretAnchorId(
  prefix: string,
  requesterName: string,
  secretName: string,
  slugger: GithubSlugger,
): string {
  slugger.reset();

  return `${prefix}-${slugger.slug(`${requesterName}--${secretName}`)}`;
}

function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const groups: [string, T[]][] = [];
  let currentKey = "";
  let currentGroup: T[] = [];

  for (const item of items) {
    const k = key(item);

    if (k !== currentKey) {
      if (currentGroup.length > 0) groups.push([currentKey, currentGroup]);
      currentKey = k;
      currentGroup = [item];
    } else {
      currentGroup.push(item);
    }
  }

  if (currentGroup.length > 0) groups.push([currentKey, currentGroup]);

  return groups;
}

function heading(depth: 1 | 2 | 3 | 4 | 5 | 6, text: string): Heading {
  return {
    type: "heading",
    depth,
    children: [{ type: "text", value: text }],
  };
}

function paragraph(text: string): Paragraph {
  return { type: "paragraph", children: [{ type: "text", value: text }] };
}

function html(value: string): Html {
  return { type: "html", value };
}

function bulletList(...items: ListItem[]): List {
  return { type: "list", ordered: false, spread: false, children: items };
}

function linkItem(
  textBefore: string,
  linkText: string,
  linkUrl: string,
): ListItem {
  const link: Link = {
    type: "link",
    url: linkUrl,
    children: [{ type: "text", value: linkText }],
  };
  const phrasing: PhrasingContent[] = [
    { type: "text", value: textBefore },
    link,
  ];

  return {
    type: "listItem",
    spread: false,
    children: [{ type: "paragraph", children: phrasing }],
  };
}

function usedByItem(entry: UsedByEntry): ListItem {
  const link: Link = {
    type: "link",
    url: `#${entry.secretAnchor}`,
    children: [{ type: "text", value: entry.secretName }],
  };
  const phrasing: PhrasingContent[] = [
    link,
    { type: "text", value: ` (${entry.requesterName})` },
  ];

  return {
    type: "listItem",
    spread: false,
    children: [{ type: "paragraph", children: phrasing }],
  };
}
```

> **Important notes for the implementer:**
>
> - The `secretAnchorId` function calls `slugger.reset()` before each slug
>   generation. This is because `github-slugger` tracks used slugs to append
>   `-1`, `-2` for duplicates, but we want deterministic anchors. The same
>   anchor is generated in multiple places (failures section, provisioning
>   section, used-by links) and must match.
> - The `linkItem` in the failures section renders as
>   ``- ❌ [`SECRET_NAME`](#anchor)`` — using backticks around the secret name.
>   To get backtick formatting, use `inlineCode` mdast nodes instead of `text`
>   for the link children:
>   `children: [{ type: "inlineCode", value: secretName }]`
> - Similarly, the `usedByItem` should use `inlineCode` for the secret name in
>   the link.
> - Check the spec for exact formatting. The `<details>` summary line uses
>   special formatting — no backtick code in there.

- [ ] **Step 4: Run the tests to generate snapshot files**

Run: `npm exec -- vitest --run test/suite/unit/summary.spec.ts`

Expected: PASS — snapshot files created.

- [ ] **Step 5: Review the generated fixture files**

Check the generated files under `test/fixture/summary/`. Verify each scenario:

- `all-provisioned/expected.md`: Stats heading shows "Provisioned 2 secrets", no
  failures section, both secret provisioning and token issuing sections
- `some-denied/expected.md`: Stats heading shows "Provisioned 1 of 2 secrets",
  failures section lists the denied secret with link
- `all-denied/expected.md`: Stats heading shows "Provisioned 0 of 1 secret",
  failures section present
- `empty/expected.md`: Stats heading shows "Provisioned 0 secrets", no other
  sections
- `single-secret/expected.md`: Stats heading shows "Provisioned 1 secret"
  (singular)
- `environment-targets/expected.md`: Environment names appear in target subjects
- `multiple-requesters/expected.md`: Multiple requester headings in provisioning
  section, multiple consumer headings in token issuing section
- `selected-and-no-repos/expected.md`: Token headings show "(3 repos)" and "(no
  repos)"
- `token-with-role/expected.md`: Token auth breakdown shows "requested with role
  deployer"

Check that all anchor IDs are consistent between the failures section, the
provisioning section `<a id>` tags, and the token issuing "Used by" links.

- [ ] **Step 6: Run make precommit**

Run: `make precommit`

Expected: All checks pass (lint, tests, type-check). Run `git status` afterwards
to see if any files were regenerated.

- [ ] **Step 7: Commit**

```bash
git add src/summary.ts \
  test/suite/unit/summary.spec.ts \
  test/fixture/summary/
git commit -m "Add summary renderer

Builds a job summary document from authorization results using
mdast AST nodes and renders to Markdown. Includes stats heading,
failures section, secret provisioning details, and token issuing
details with cross-reference links.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Integration with main.ts

**Files:**

- Modify: `src/main.ts`

### Context

Wire the `renderSummary()` function into the main action flow. After the
authorizer completes, render the summary and write it to `@actions/core`'s
summary API.

The anchor prefix is derived from `GITHUB_ACTION` env var (the step ID). The
format is `pgt-{suffix}` where `suffix` is the `GITHUB_ACTION` value (which
GitHub sets to a unique identifier per step in the workflow).

`main.ts` has `/* istanbul ignore file */` so this code is not covered by unit
tests. The `renderSummary()` function itself is thoroughly tested.

- [ ] **Step 1: Modify main.ts**

Add the summary import and call after the "Authorizing requests" group. The
`authorize()` method already returns `AuthorizeResult` — capture it and use it.

In `src/main.ts`, make these changes:

1. Add imports at the top:

```typescript
import { group, setFailed, summary } from "@actions/core";
import { renderSummary } from "./summary.js";
```

2. Capture the authorize result by changing the authorize group to return it:

```typescript
const authorizeResult = await group("Authorizing requests", async () => {
  return await authorizer.authorize(Array.from(requesters.values()));
});
```

3. Add summary writing after the authorize group and before "Creating tokens":

```typescript
await group("Writing summary", async () => {
  const prefix = `pgt-${process.env.GITHUB_ACTION ?? ""}`;
  const markdown = renderSummary(authorizeResult, prefix);

  await summary.addRaw(markdown).write();
});
```

4. Update the "Creating tokens" and "Provisioning secrets" groups to use
   `tokenAuthorizer.listResults()` and `provisionAuthorizer.listResults()`
   respectively (they already do — no changes needed).

- [ ] **Step 2: Run make precommit**

Run: `make precommit`

Expected: All checks pass. Run `git status` afterwards to see if any files were
regenerated (dist bundle will change).

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "Write job summary after authorization

Renders the authorization results as a Markdown summary and writes
it to the GitHub Actions summary page via @actions/core.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Final verification

- [ ] **Step 1: Run full precommit**

Run: `make precommit`

This runs lint, tests, rebuilds the dist bundle, regenerates schemas, and
verifies generated files.

Expected: All checks pass.

- [ ] **Step 2: Check for regenerated files**

Run: `git status`

Stage any regenerated files (dist bundle, schemas):

```bash
git add dist/ src/schema/
```

- [ ] **Step 3: Run coverage**

Run: `make coverage`

Expected: 100% coverage on all new files (`src/summary.ts`,
`src/token-auth-explainer/markdown.ts`,
`src/provision-auth-explainer/markdown.ts`). `src/main.ts` is excluded via
istanbul ignore.

If any branches are uncovered, add tests for them. If a branch is genuinely
unreachable (invariant violation), use `/* istanbul ignore next - @preserve */`.

- [ ] **Step 4: Commit regenerated files if any**

```bash
git add -A
git commit -m "Regenerate dist bundle

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Implementation notes

### Common pitfalls

1. **mdast-util-to-markdown adds blank lines between list items by default.**
   Set `spread: false` on both `List` and `ListItem` nodes to get compact
   output. The code in the plan already does this.

2. **github-slugger is stateful** — it remembers previously generated slugs and
   appends `-1`, `-2` to avoid duplicates. Call `slugger.reset()` before
   generating each anchor to ensure deterministic output. Alternatively, create
   a new slugger for each anchor generation.

3. **`<details>` content must have blank lines** between the opening HTML tag
   and the Markdown content for GitHub's renderer to parse the Markdown inside.
   `mdast-util-to-markdown` handles this naturally since it adds newlines
   between nodes.

4. **Import extensions** — all imports must use `.js` extensions per the project
   convention.

5. **The `iconItem` helper pattern** — both explainers use the same helper
   pattern for creating list items with icon prefixes. Consider extracting
   shared helpers to a common module (e.g., `src/mdast-helpers.ts`) if the
   duplication becomes unwieldy. However, for the initial implementation,
   keeping them local to each explainer file is fine.

6. **`inlineCode` nodes for secret names** — In the failures section and "Used
   by" links, secret names should be rendered with backtick formatting. Use
   `{ type: "inlineCode", value: secretName }` instead of
   `{ type: "text", value: secretName }` inside link children.

7. **Sorting is already done** — The results passed to `renderSummary` may
   already be sorted (they are in the authorizer), but `renderSummary` should
   sort its own copy to be self-contained. The implementation creates sorted
   copies with spread + sort.

### Test data notes

The test helpers used in the plan:

- `createTestTokenAuthorizer(permissions)` — Creates a token authorizer that
  allows all consumers (`*` and `*/*`) for all resource types with the given
  permissions. From `test/token-authorizer.ts`.
- `createTestTokenRequestFactory()` — Creates a token request factory that
  resolves `repo-*` patterns against a fixed set of repos (`repo-a`, `repo-b`,
  `repo-c`). From `test/token-request.ts`.
- `createTestTokenDec(overrides)` — Creates a default token declaration for
  `account-a` with `all` repos and `metadata: read`. From `test/declaration.ts`.
- `createTestSecretDec(overrides)` — Creates a default secret declaration
  referencing `account-a/repo-a.tokenA`. From `test/declaration.ts`.
