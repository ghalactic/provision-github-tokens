import type { PhrasingContent } from "mdast";
import { inlineCode, strong, text } from "./markdown.js";
import type { ProvisionRequestTarget } from "./provision-request.js";

export function secretTypeText(target: ProvisionRequestTarget): string {
  const type = target.type;

  switch (target.type) {
    case "actions":
      return "GitHub Actions";
    case "codespaces":
      return "GitHub Codespaces";
    case "dependabot":
      return "Dependabot";
    case "environment":
      return `GitHub environment ${target.target.environment}`;
  }

  /* istanbul ignore next - @preserve */
  throw new Error(
    `Invariant violation: Unexpected secret type ${JSON.stringify(type)}`,
  );
}

export function secretTypeMdast(
  target: ProvisionRequestTarget,
): PhrasingContent[] {
  const type = target.type;

  switch (target.type) {
    case "actions":
      return [strong(text("GitHub Actions"))];
    case "codespaces":
      return [strong(text("GitHub Codespaces"))];
    case "dependabot":
      return [strong(text("Dependabot"))];
    case "environment":
      return [
        strong(text("GitHub environment")),
        text(" "),
        inlineCode(target.target.environment),
      ];
  }

  /* istanbul ignore next - @preserve */
  throw new Error(
    `Invariant violation: Unexpected secret type ${JSON.stringify(type)}`,
  );
}
