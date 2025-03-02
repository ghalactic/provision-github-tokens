export function stripStacks(output: string): string {
  return output.replaceAll(/^(::\w+::)?    at .*$\n/gm, "");
}
