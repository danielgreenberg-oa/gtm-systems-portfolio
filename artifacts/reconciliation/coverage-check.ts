/** Adapted source excerpt, E05. Pure wrapper around the inspected response-shape
 * and scan-cap checks. Instead of appending to a workflow error list, returns a
 * coverage result. A full page does not prove that all matching rows were read. */
export function assessCoverage(rows: unknown, cap = 500): { complete: boolean; count: number; reason: string } {
  if (!Array.isArray(rows)) throw new Error('Coverage unavailable: expected an array');
  if (!Number.isInteger(cap) || cap <= 0) throw new Error('Scan cap must be a positive integer');
  if (rows.length >= cap) return { complete: false, count: rows.length, reason: 'scan_cap_reached' };
  return { complete: true, count: rows.length, reason: 'within_this_query_scope' };
}
// This checks one bounded query response, not the freshness or completeness of a provider.
