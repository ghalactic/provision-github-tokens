export function errorMessage(error: unknown): string {
  /* v8 ignore start - never seen non-error */
  return error instanceof Error ? error.message : "unknown cause";
  /* v8 ignore stop */
}

export function errorStack(error: unknown): string {
  /* v8 ignore start - never seen non-error */
  return (error instanceof Error ? error.stack : undefined) ?? "unknown cause";
  /* v8 ignore stop */
}
