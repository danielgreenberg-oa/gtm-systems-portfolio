/** Adapted source excerpt, E04. Pure text helper from Create CRM Lead.
 * Types and exported function boundary added. Transport and private configuration omitted. */
export function sanitizeText(value: unknown, max: number): string {
  if (!value) return '';
  const control = String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127);
  const whitespace = ' ' + String.fromCharCode(9) + String.fromCharCode(10) + String.fromCharCode(13);
  return String(value)
    .replace(new RegExp('[' + control + ']', 'g'), ' ')
    .replace(new RegExp('[' + whitespace + ']+', 'g'), ' ')
    .trim()
    .substring(0, max);
}
// Callers must supply a sensible nonnegative length. This helper does not validate identity.
