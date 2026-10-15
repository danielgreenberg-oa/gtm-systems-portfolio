import test from 'node:test';
import assert from 'node:assert/strict';
import { type CanonicalRecord, type ReconciliationEvent, runReconciliation, planReconciliation, acknowledgeReconciliation } from '../src/reconciliation.ts';
const record: CanonicalRecord = { tenantId: 'tenant-a', contactId: 'contact-1', stage: 'new', version: 1, owner: 'automation' };
const event: ReconciliationEvent = { tenantId: 'tenant-a', id: 'event-1', contactId: 'contact-1', stage: 'engaged', version: 2, source: 'webhook', outcome: 'success' };
const input = { maxAttempts: 2, state: { records: [record], receipts: [] }, events: [event] };
test('missed webhook recovery succeeds, then duplicate receipt proposes no repeated side effect', () => {
  const result = runReconciliation({ ...input, events: [{ ...event, source: 'recovery' }, event] });
  assert.deepEqual(result.decisions.map(d => d.status), ['simulated_completed', 'duplicate']);
  assert.equal(result.decisions.filter(d => d.action).length, 1);
  assert.equal(result.state.records[0]?.stage, 'engaged');
});
test('failure retries without false completion and stops at terminal attempt limit', () => {
  const result = runReconciliation({ ...input, events: [{ ...event, outcome: 'failure' }, { ...event, outcome: 'failure' }, event] });
  assert.deepEqual(result.decisions.map(d => d.status), ['failed', 'exhausted', 'exhausted']);
  assert.equal(result.state.records[0]?.stage, 'new');
  assert.equal(result.state.receipts[0]?.attempts, 2);
});
test('pending action remains pending on replay and canonical state is unchanged', () => {
  const result = runReconciliation({ ...input, events: [{ ...event, outcome: 'pending' }, event] });
  assert.deepEqual(result.decisions.map(d => d.status), ['pending', 'pending']);
  assert.equal(result.state.records[0]?.stage, 'new');
  assert.equal(result.decisions[1]?.action, null);
});
test('human, CRM, unknown identity and older events are held without proposed actions', () => {
  for (const owner of ['human', 'crm']) {
    const result = runReconciliation({ ...input, state: { records: [{ ...record, owner }], receipts: [] } });
    assert.equal(result.decisions[0]?.reason, 'canonical_owner_conflict');
    assert.equal(result.decisions[0]?.action, null);
  }
  assert.equal(runReconciliation({ ...input, events: [{ ...event, contactId: 'missing' }] }).decisions[0]?.reason, 'unknown_identity');
  assert.equal(runReconciliation({ ...input, events: [{ ...event, version: 0 }] }).decisions[0]?.status, 'older');
});
test('deterministic replay and tenant-scoped event identities', () => {
  assert.deepEqual(runReconciliation(input), runReconciliation(input));
  const result = runReconciliation({ ...input, state: { records: [record, { ...record, tenantId: 'tenant-b' }], receipts: [] }, events: [event, { ...event, tenantId: 'tenant-b' }] });
  assert.equal(result.decisions.filter(d => d.action).length, 2);
  assert.notEqual(result.decisions[0]?.action?.idempotencyKey, result.decisions[1]?.action?.idempotencyKey);
});
test('failed recovery can resume from persisted state; new event cannot repeat an already current side effect', () => {
  const failed = runReconciliation({ ...input, events: [{ ...event, outcome: 'failure' }] });
  const resumed = runReconciliation({ ...input, state: failed.state, events: [{ ...event, source: 'recovery' }] });
  assert.equal(resumed.decisions[0]?.status, 'simulated_completed');
  const replay = runReconciliation({ ...input, state: resumed.state, events: [{ ...event, id: 'another-event' }] });
  assert.equal(replay.decisions[0]?.status, 'already_current');
  assert.equal(replay.decisions[0]?.action, null);
});
test('planning never completes work; exact action acknowledgment does', () => {
  const planned = planReconciliation(input.state, event, 2);
  assert.equal(planned.state.records[0]?.stage, 'new');
  assert.equal(planned.state.receipts[0]?.status, 'pending');
  assert.ok(planned.action);
  const action = planned.action;
  const acknowledged = acknowledgeReconciliation(planned.state, action, 'success', 2);
  assert.equal(acknowledged.records[0]?.stage, 'engaged');
  assert.throws(() => acknowledgeReconciliation(planned.state, { ...action, attempt: 99 }, 'success', 2), /stale|claim/);
  assert.throws(() => acknowledgeReconciliation({ ...planned.state, records: [{ ...record, owner: 'human' }] }, action, 'success', 2), /canonical/);
});
test('payload collision and malformed event cannot claim a completed result', () => {
  const first = runReconciliation(input);
  const collision = runReconciliation({ ...input, state: first.state, events: [{ ...event, stage: 'qualified' }] });
  assert.equal(collision.decisions[0]?.reason, 'event_identity_conflict');
  assert.throws(() => runReconciliation({ ...input, maxAttempts: 0 }), /maxAttempts/);
  assert.throws(() => runReconciliation({ ...input, events: [{ ...event, outcome: 'maybe' }] }), /outcome/);
  assert.throws(() => runReconciliation({ ...input, state: { records: [record, record], receipts: [] } }), /duplicate canonical/);
});
test('different event cannot overlap an unconfirmed action on the same canonical contact', () => {
  const result = runReconciliation({ ...input, events: [{ ...event, outcome: 'pending' }, { ...event, id: 'new-event', version: 3, stage: 'qualified' }] });
  assert.equal(result.decisions[1]?.status, 'pending');
  assert.equal(result.decisions[1]?.action, null);
  assert.equal(result.state.records[0]?.stage, 'new');
});
test('same-version disagreement is held and same-stage newer event advances watermark without side effect', () => {
  const conflict = runReconciliation({ ...input, events: [{ ...event, version: 1 }] });
  assert.equal(conflict.decisions[0]?.reason, 'same_version_conflict');
  assert.equal(conflict.decisions[0]?.action, null);
  const current = runReconciliation({ ...input, events: [{ ...event, stage: 'new', version: 3 }, { ...event, id: 'older-event' }] });
  assert.equal(current.decisions[0]?.status, 'already_current');
  assert.equal(current.decisions[0]?.action, null);
  assert.equal(current.state.records[0]?.version, 3);
  assert.equal(current.decisions[1]?.status, 'older');
});
