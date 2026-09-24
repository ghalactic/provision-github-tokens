export function errorCause(error: unknown): Error | undefined {
  return error instanceof Error && error.cause instanceof Error
    ? error.cause
    : undefined;
}

export function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).trim();
}

export function errorStack(error: unknown): string {
  return (
    error instanceof Error ? (error.stack ?? error.message) : String(error)
  ).trim();
}
