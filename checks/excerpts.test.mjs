import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleKey } from '../artifacts/context-os/event-routing.ts';
import { sanitizeText } from '../artifacts/crm/normalize-text.ts';
import { offerMatchesSegment, simpleHash } from '../artifacts/lead-research/offer-routing.ts';
import { mergeIntelligence, mergeUnique } from '../artifacts/call-intelligence/merge-context.ts';
import { assessCoverage } from '../artifacts/reconciliation/coverage-check.ts';

test('a meeting stops depending on its arrival channel for rule selection', () => {
  assert.equal(ruleKey('email', 'meeting_booked'), 'on_meeting_booked');
  assert.equal(ruleKey('linkedin', 'information_request'), 'on_linkedin_reply');
  assert.equal(ruleKey('email', 'unexpected'), 'unknown');
});
test('text normalization removes controls and bounds CRM note fragments', () => {
  assert.equal(sanitizeText(' one\n\t two\u0000three ', 7), 'one two');
});
test('segment excerpt exposes permissive behavior explicitly', () => {
  assert.equal(offerMatchesSegment({ committed_segments: ['SOFTWARE'] }, 'LOGISTICS'), false);
  assert.equal(offerMatchesSegment({ committed_segments: ['SOFTWARE'] }, ''), true);
  assert.equal(simpleHash('tenant|company|title'), simpleHash('tenant|company|title'));
});
test('intake values override call values while null preserves the earlier layer', () => {
  const input = { size: 1, precall_research: { size: 2 }, call_extracted: { size: 3, pain: 'manual' },
    onboarding_form_ingestion: { size: 4, pain: null } };
  assert.deepEqual(mergeIntelligence(input), { size: 4, pain: 'manual' });
  assert.deepEqual(mergeUnique(['Manual work'], [' manual work ', 'New pain']), ['Manual work', 'New pain']);
});
test('a full response page is incomplete coverage rather than an empty error list', () => {
  assert.equal(assessCoverage([1, 2], 2).complete, false);
  assert.equal(assessCoverage([], 2).complete, true);
  assert.throws(() => assessCoverage(null), /Coverage unavailable/);
});
