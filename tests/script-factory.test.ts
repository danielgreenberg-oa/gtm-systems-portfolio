import test from 'node:test';
import assert from 'node:assert/strict';
import { runScriptFactory } from '../src/script-factory.ts';

const approved = {
  offer: { id: 'synthetic-offer', approved: true, segment: 'synthetic-retail', claims: ['12 hours'] },
  segment: 'synthetic-retail', maxAttempts: 2,
  candidates: [
    { opener: 'Our plan saves 12 hours.', cta: 'Send the plan?', verdict: 'revise', feedback: 'Name the deliverable.' },
    { opener: 'The inventory plan targets 12 hours.', cta: 'Send the plan?', verdict: 'pass', feedback: '' }
  ]
};
test('packages only after deterministic guards and evaluator pass', () => {
  const result = runScriptFactory(approved);
  assert.equal(result.status, 'packaged');
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0]?.accepted, false);
  assert.equal(result.package?.opener, 'The inventory plan targets 12 hours.');
});
test('missing approval prevents even a passing candidate from shipping', () => {
  const result = runScriptFactory({ ...approved, offer: { ...approved.offer, approved: false } });
  assert.equal(result.status, 'held');
  assert.equal(result.package, null);
  assert.equal(result.attempts.length, 0);
});
test('initial attempt counts toward maxAttempts and exhaustion has no package', () => {
  const result = runScriptFactory({ ...approved, maxAttempts: 1 });
  assert.equal(result.status, 'exhausted');
  assert.equal(result.attempts.length, 1);
  assert.equal(result.package, null);
});
test('unsupported number and segment mismatch cannot be overridden by evaluator', () => {
  const candidate = { opener: 'Save 99 hours.', cta: 'Send the plan?', verdict: 'pass', feedback: '' };
  const result = runScriptFactory({ ...approved, candidates: [candidate, candidate] });
  assert.equal(result.status, 'exhausted');
  assert.ok(result.attempts[0]?.issues.includes('unsupported_numeric_claim'));
  assert.equal(runScriptFactory({ ...approved, segment: 'synthetic-healthcare' }).status, 'held');
});
test('numeric approval cannot authorize a different outcome with the same number', () => {
  const candidate = { opener: 'We add 12 customers.', cta: 'Send the plan?', verdict: 'pass', feedback: '' };
  assert.equal(runScriptFactory({ ...approved, candidates: [candidate] }).status, 'exhausted');
});
test('malformed verdict, missing candidate and invalid attempt bound fail clearly', () => {
  assert.throws(() => runScriptFactory(null), /input must be an object/);
  assert.throws(() => runScriptFactory({ ...approved, maxAttempts: 0 }), /maxAttempts/);
  assert.throws(() => runScriptFactory({ ...approved, candidates: [] }), /candidates/);
  assert.throws(() => runScriptFactory({ ...approved, candidates: [{ ...approved.candidates[0], verdict: 'maybe' }] }), /verdict/);
});
test('passing evaluator cannot bypass opener and CTA guards', () => {
  const candidate = { opener: Array(34).fill('word').join(' ') + ' 12 hours', cta: 'Book something', verdict: 'pass', feedback: '' };
  const result = runScriptFactory({ ...approved, candidates: [candidate] });
  assert.equal(result.status, 'exhausted');
  assert.deepEqual(result.attempts[0]?.issues, ['opener_too_long', 'cta_must_be_short_question']);
});
test('approved numeric phrase must match whole words and cannot hide larger numbers', () => {
  const candidate = { opener: 'Save 112 hours.', cta: 'Send the plan?', verdict: 'pass', feedback: '' };
  assert.equal(runScriptFactory({ ...approved, candidates: [candidate] }).status, 'exhausted');
});
test('missing approved claims holds the brief and candidate must use an approved claim', () => {
  const missing = runScriptFactory({ ...approved, offer: { ...approved.offer, claims: [] } });
  assert.equal(missing.status, 'held');
  assert.equal(missing.reason, 'no_approved_claims');
  const candidate = { opener: 'Here is an inventory plan.', cta: 'Send the plan?', verdict: 'pass', feedback: '' };
  const unanchored = runScriptFactory({ ...approved, candidates: [candidate] });
  assert.equal(unanchored.status, 'exhausted');
  assert.ok(unanchored.attempts[0]?.issues.includes('missing_approved_claim'));
});
