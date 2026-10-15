/** Boundary validation for untrusted local JSON fixtures. */
export function object(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value as Record<string, unknown>;
}
export function text(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} must be a non-empty string`);
  return value;
}
export function bool(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${name} must be boolean`);
  return value;
}
export function list(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value;
}
export function strings(value: unknown, name: string): string[] {
  return list(value, name).map((item, i) => text(item, `${name}[${i}]`));
}
export function integer(value: unknown, name: string, min = 0, max = 100): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer from ${min} to ${max}`);
  return value;
}
export function choice<const T extends readonly string[]>(value: unknown, choices: T, name: string): T[number] {
  if (typeof value !== 'string' || !choices.includes(value)) throw new Error(`${name} must be one of ${choices.join(', ')}`);
  return value as T[number];
}
// JSON tuples avoid collisions when a caller-supplied identity contains a separator.
export function identity(...parts: string[]): string { return JSON.stringify(parts); }
