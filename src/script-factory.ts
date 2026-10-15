import { bool, choice, integer, list, object, strings, text } from './validation.ts';

/** Artifact: synthetic offline decision model, not a production copy evaluator. */
export interface Candidate { opener: string; cta: string; verdict: 'pass' | 'revise'; feedback: string }
export interface ScriptInput {
  offer: { id: string; approved: boolean; segment: string; claims: string[] };
  segment: string;
  /** Includes the initial attempt. Candidate supply can end sooner. */
  maxAttempts: number;
  candidates: Candidate[];
}
export interface ScriptResult {
  artifact: 'synthetic-offline-demo'; status: 'held' | 'packaged' | 'exhausted';
  reason: string; trace: string[];
  attempts: { attempt: number; accepted: boolean; issues: string[]; feedback: string }[];
  package: { offerId: string; segment: string; opener: string; cta: string; claimsAreSynthetic: true } | null;
}
export function parseScriptInput(value: unknown): ScriptInput {
  const input = object(value, 'input');
  const offer = object(input.offer, 'offer');
  const candidates = list(input.candidates, 'candidates').map((item, i): Candidate => {
    const candidate = object(item, `candidates[${i}]`);
    if (typeof candidate.feedback !== 'string') throw new Error(`candidates[${i}].feedback must be a string`);
    return { opener: text(candidate.opener, 'opener'), cta: text(candidate.cta, 'cta'), verdict: choice(candidate.verdict, ['pass', 'revise'], 'verdict'), feedback: candidate.feedback };
  });
  if (!candidates.length) throw new Error('candidates must contain at least one candidate');
  return {
    offer: { id: text(offer.id, 'offer.id'), approved: bool(offer.approved, 'offer.approved'), segment: text(offer.segment, 'offer.segment'), claims: strings(offer.claims, 'offer.claims') },
    segment: text(input.segment, 'segment'), maxAttempts: integer(input.maxAttempts, 'maxAttempts', 1, 20), candidates
  };
}
function guard(candidate: Candidate, claims: string[]): string[] {
  const issues: string[] = [];
  if (candidate.opener.trim().split(/\s+/).length > 35) issues.push('opener_too_long');
  if (candidate.cta.trim().split(/\s+/).length > 12 || !candidate.cta.endsWith('?')) issues.push('cta_must_be_short_question');
  if ([candidate.opener, candidate.cta].some(value => value.includes(String.fromCodePoint(0x2014)))) issues.push('unsupported_punctuation');
  // Remove whole approved claim phrases, not just their number, before scanning.
  let unapproved = `${candidate.opener} ${candidate.cta}`.toLowerCase();
  let hasApprovedClaim = false;
  for (const claim of [...claims].sort((a, b) => b.length - a.length)) {
    const escaped = claim.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const remainder = unapproved.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'gu'), '');
    hasApprovedClaim ||= remainder !== unapproved;
    unapproved = remainder;
  }
  if (/\p{N}/u.test(unapproved)) issues.push('unsupported_numeric_claim');
  if (!hasApprovedClaim) issues.push('missing_approved_claim');
  return issues;
}
export function runScriptFactory(value: unknown): ScriptResult {
  const input = parseScriptInput(value);
  const result: ScriptResult = { artifact: 'synthetic-offline-demo', status: 'held', reason: '', trace: [], attempts: [], package: null };
  if (!input.offer.approved || input.segment !== input.offer.segment || input.offer.claims.length === 0) {
    result.reason = !input.offer.approved ? 'offer_not_approved' : input.segment !== input.offer.segment ? 'segment_mismatch' : 'no_approved_claims';
    result.trace.push(`HOLD: ${result.reason}. No candidate evaluated.`);
    return result;
  }
  result.trace.push('Approved synthetic offer and segment verified. maxAttempts includes the initial attempt.');
  for (const [index, candidate] of input.candidates.slice(0, input.maxAttempts).entries()) {
    const issues = guard(candidate, input.offer.claims);
    if (candidate.verdict !== 'pass') issues.push('fixture_evaluator_requested_revision');
    const accepted = issues.length === 0;
    result.attempts.push({ attempt: index + 1, accepted, issues, feedback: candidate.feedback });
    result.trace.push(`Attempt ${index + 1}: ${accepted ? 'PASS' : issues.join(', ')}${candidate.feedback ? `. Feedback: ${candidate.feedback}` : ''}`);
    if (accepted) {
      result.status = 'packaged'; result.reason = 'both_gates_passed';
      result.package = { offerId: input.offer.id, segment: input.segment, opener: candidate.opener, cta: candidate.cta, claimsAreSynthetic: true };
      result.trace.push('Packaged passing candidate locally. No message sent.');
      return result;
    }
  }
  result.status = 'exhausted';
  result.reason = result.attempts.length === input.maxAttempts ? 'attempt_limit_reached' : 'candidate_supply_exhausted';
  result.trace.push(`STOP: ${result.reason}. Nothing packaged.`);
  return result;
}
