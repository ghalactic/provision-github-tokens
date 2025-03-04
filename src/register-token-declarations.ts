import type { DiscoveredConsumer } from "./discover-consumers.js";
import type { TokenDeclarationRegistry } from "./token-declaration-registry.js";

export function registerTokenDeclarations(
  declarationRegistry: TokenDeclarationRegistry,
  consumers: Map<string, DiscoveredConsumer>,
): void {
  for (const [, { account, repo, config }] of consumers) {
    for (const [name, declaration] of Object.entries(config.tokens)) {
      declarationRegistry.registerDeclaration(account, repo, name, declaration);
    }
  }
}
