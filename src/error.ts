export function errorMessage(error: unknown): string {
  /* v8 ignore start - never seen non-error */
  return (error instanceof Error ? error.message : String(error)).trim();
  /* v8 ignore stop */
}

export function errorStack(error: unknown): string {
  /* v8 ignore start - never seen non-error */
  return error instanceof Error
    ? (error.stack ?? error.message)
    : String(error);
  /* v8 ignore stop */
}
