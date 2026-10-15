/** Adapted source excerpts, E06. Types and exports added; source helper behavior preserved.
 * This match helper accepts an empty segment or empty commitments. The surrounding
 * production route exposes coverage_gap and can fall back. It is not a strict eligibility gate. */
export interface SegmentOffer { committed_segments?: string[] }
export function offerMatchesSegment(offer: SegmentOffer, segment: string): boolean {
  if (!offer.committed_segments || offer.committed_segments.length === 0) return true;
  if (offer.committed_segments.includes('CROSS_VERTICAL')) return true;
  if (!segment) return true;
  return offer.committed_segments.includes(segment);
}

/** Stable non-cryptographic allocation hash. Input normalization happens in the caller. */
export function simpleHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
