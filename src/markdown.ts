import type {
  AlignType,
  Blockquote,
  Emphasis,
  Heading,
  Html,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  Text,
} from "mdast";

export function blockquote(...children: Blockquote["children"]): Blockquote {
  return { type: "blockquote", children };
}

export function emphasis(...children: Emphasis["children"]): Emphasis {
  return { type: "emphasis", children };
}

export function gfmAlert(
  type: "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION",
  ...children: Blockquote["children"]
): Blockquote {
  return blockquote(paragraph(text(`[!${type}]`)), ...children);
}

export function details(body: string): Html {
  return html(
    `<details>\n<summary>Error details</summary>\n\n` +
      `\`\`\`\n${body}\n\`\`\`\n\n</details>\n`,
  );
}

export function heading(
  depth: Heading["depth"],
  ...children: Heading["children"]
): Heading {
  return { type: "heading", depth, children };
}

export function html(value: string): Html {
  return { type: "html", value };
}

export function list(
  items: {
    contents: Paragraph["children"];
    nested?: List;
  }[],
): List {
  return {
    type: "list",
    ordered: false,
    spread: false,
    children: items.map(({ contents, nested }): ListItem => ({
      type: "listItem",
      spread: false,
      checked: null,
      children: [
        { type: "paragraph", children: contents },
        ...(nested ? [nested] : []),
      ],
    })),
  };
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
        children: headings.map((children): TableCell => ({
          type: "tableCell",
          children,
        })),
      },
      ...rows.map((row): TableRow => ({
        type: "tableRow",
        children: row.map((children): TableCell => ({
          type: "tableCell",
          children,
        })),
      })),
    ],
  };
}

export function text(value: string): Text {
  return { type: "text", value };
}
