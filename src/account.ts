import type { AccountReference } from "./github-reference.js";

export function normalizeAccountPattern(
  definingAccount: AccountReference,
  pattern: string,
): string {
  return pattern === "." ? definingAccount.account : pattern;
}
