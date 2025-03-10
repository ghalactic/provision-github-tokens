import type { DiscoveredRequester } from "./discover-requesters.js";
import type { TokenDeclarationRegistry } from "./token-declaration-registry.js";

export function registerTokenDeclarations(
  declarationRegistry: TokenDeclarationRegistry,
  requesters: Map<string, DiscoveredRequester>,
): void {
  for (const [, { requester, config }] of requesters) {
    for (const [name, declaration] of Object.entries(config.tokens)) {
      declarationRegistry.registerDeclaration(requester, name, declaration);
    }
  }
}
