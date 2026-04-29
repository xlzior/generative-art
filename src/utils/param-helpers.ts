/**
 * Safely cast a parameter value to a number
 * Useful when working with Record<string, number | string | boolean>
 */
export function asNumber(value: unknown): number {
  const num = Number(value);
  if (Number.isNaN(num)) {
    console.warn(`Expected number, got ${typeof value}:`, value);
    return 0;
  }
  return num;
}

/**
 * Safely cast a parameter value to a string
 */
export function asString(value: unknown): string {
  return String(value);
}

/**
 * Safely cast a parameter value to a boolean
 */
export function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}
