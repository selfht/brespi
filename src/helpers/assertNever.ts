/**
 * This function can be used to ensure exhaustion in switch expressions
 */
export function assertNever(never: never) {
  throw new Error(`Unhandled case: ${String(never)}`);
}
