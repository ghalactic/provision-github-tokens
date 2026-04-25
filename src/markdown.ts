import type {
  AlignType,
  Emphasis,
  Heading,
  InlineCode,
  Link,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  Text,
} from "mdast";
import {
  accountOrRepoRefToString,
  type AccountOrRepoReference,
} from "./github-reference.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function accountOrRepoLink(
  githubServerURL: string,
  accountOrRepo: AccountOrRepoReference,
): Link {
  const slug = accountOrRepoRefToString(accountOrRepo);

  return link(new URL(slug, githubServerURL), text(slug));
}

export function emphasis(...children: Emphasis["children"]): Emphasis {
  return { type: "emphasis", children };
}

export function heading(
  depth: Heading["depth"],
  ...children: Heading["children"]
): Heading {
  return { type: "heading", depth, children };
}

export function inlineCode(code: string): InlineCode {
  return { type: "inlineCode", value: code };
}

export function link(url: string | URL, ...children: Link["children"]): Link {
  return { type: "link", url: url.toString(), children };
}

export function paragraph(...children: Paragraph["children"]): Paragraph {
  return { type: "paragraph", children };
}

export function renderIcon(isAllowed: boolean): string {
  return isAllowed ? ALLOWED_ICON : DENIED_ICON;
}

export function table(
  align: AlignType[] | undefined,
  headings: TableCell["children"][],
  rows: TableCell["children"][][],
): Table {
  return {
    type: "table",
    align,
    children: [
      {
        type: "tableRow",
        children: headings.map(
          (children): TableCell => ({ type: "tableCell", children }),
        ),
      },
      ...rows.map(
        (row): TableRow => ({
          type: "tableRow",
          children: row.map(
            (children): TableCell => ({ type: "tableCell", children }),
          ),
        }),
      ),
    ],
  };
}

export function text(value: string): Text {
  return { type: "text", value };
}
