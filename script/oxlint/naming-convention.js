/* eslint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-argument, typescript/no-unsafe-member-access, typescript/no-unsafe-return -- untyped ESLint plugin API */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Oxlint has no native equivalent of @typescript-eslint/naming-convention, and
// its type-aware backend does not implement the rule either. Load the real rule
// through Oxlint's JS plugin bridge instead. The rule asks for parser services
// only to read `compilerOptions.target`, which is used for the `requiresQuotes`
// modifier. This config does not use that modifier, so empty parser services are
// enough.
const rules = require("@typescript-eslint/eslint-plugin/use-at-your-own-risk/rules");

const emptyParserServices = {
  esTreeNodeToTSNodeMap: new Map(),
  tsNodeToESTreeNodeMap: new Map(),
  program: null,
};

function withParserServices(context) {
  const sourceCode = Object.create(context.sourceCode ?? {});
  Object.defineProperty(sourceCode, "parserServices", {
    value: emptyParserServices,
    enumerable: true,
  });

  const derived = Object.create(context);
  Object.defineProperty(derived, "sourceCode", {
    value: sourceCode,
    enumerable: true,
  });

  return derived;
}

const namingConvention = rules["naming-convention"];

if (namingConvention === undefined) {
  throw new Error(
    "Invariant violation: @typescript-eslint/naming-convention is not available",
  );
}

export default {
  meta: { name: "ts-naming" },
  rules: {
    "naming-convention": {
      ...namingConvention,
      create: (context) => namingConvention.create(withParserServices(context)),
    },
  },
};
