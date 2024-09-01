export function stripStacks(output: string): string {
  return output.replaceAll(/^    at .*$\n/gm, "");
}
