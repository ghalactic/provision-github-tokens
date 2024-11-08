import { errorMessage } from "../error.js";

export function withErrorContext<T>(context: string, fn: () => T): T {
  try {
    return fn();
  } catch (cause) {
    throw new Error(`${context}: ${errorMessage(cause)}`, { cause });
  }
}
