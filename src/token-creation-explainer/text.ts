import { debug } from "@actions/core";
import { errorMessage, errorStack } from "../error.js";
import type { TokenCreationResult } from "../token-factory.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";
import type { TokenCreationResultExplainer } from "../type/token-creation-result.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function createTextTokenCreationExplainer(
  results: Map<TokenAuthResult, TokenCreationResult>,
): TokenCreationResultExplainer<string> {
  const resultIndexes = new Map<TokenCreationResult, number>();
  const authResultIndexes = new Map<TokenAuthResult, number>();

  let index = 0;
  for (const [authResult, result] of results) {
    authResultIndexes.set(authResult, index);

    if (!resultIndexes.has(result)) {
      resultIndexes.set(result, index);
    }

    ++index;
  }

  return (authResult, creationResult) => {
    const currentIndex = authResultIndexes.get(authResult);
    const firstIndex = resultIndexes.get(creationResult);

    if (
      creationResult.type === "CREATED" &&
      currentIndex !== undefined &&
      firstIndex !== undefined &&
      firstIndex !== currentIndex
    ) {
      return `${ALLOWED_ICON} Same token as #${firstIndex + 1}`;
    }

    return explainResult(authResult, creationResult);
  };
}

function explainResult(
  authResult: TokenAuthResult,
  result: TokenCreationResult,
): string {
  const account = authResult.request.tokenDec.account;

  switch (result.type) {
    case "CREATED":
      return `${ALLOWED_ICON} Token created for ${account}`;

    case "NOT_ALLOWED":
      return `${DENIED_ICON} Token not allowed`;

    case "NO_ISSUER":
      return `${DENIED_ICON} No suitable issuer app`;

    case "REQUEST_ERROR": {
      const summary = `${DENIED_ICON} Failed to create token: ${result.error.status}: ${result.error.message}`;
      const body = result.error.response?.data;

      if (body !== undefined) {
        debugMultiLine("  ", JSON.stringify(body, null, 2));
      } else {
        debugMultiLine("  ", "(no response data)");
      }

      return summary;
    }

    case "ERROR": {
      const summary = `${DENIED_ICON} Failed to create token: ${errorMessage(result.error)}`;

      debugMultiLine("  ", errorStack(result.error));

      return summary;
    }
  }
}

function debugMultiLine(indent: string, text: string): void {
  for (const line of text.split("\n")) {
    debug(`${indent}${line}`);
  }
}
