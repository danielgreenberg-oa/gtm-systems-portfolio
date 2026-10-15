import test from 'node:test';
import assert from 'node:assert/strict';
import { runOnboarding } from '../src/onboarding.ts';

const tenant = { id: 'tenant-a', prerequisites: ['intake_received'], approvals: ['provisioning_approved', 'launch_approved'], completedSteps: [], receipts: [] };
const event = { tenantId: 'tenant-a', id: 'event-1', step: 'create_workspace', outcome: 'success' };
test('partial completion resumes after failure without repeating completed provisioning', () => {
  const result = runOnboarding({ tenants: [tenant], events: [event,
    { ...event, id: 'event-2', step: 'configure_routing', outcome: 'failure' },
    { ...event, id: 'event-2', step: 'configure_routing' },
    { ...event, id: 'event-3', step: 'launch' }, event] });
  assert.deepEqual(result.decisions.map(d => d.status), ['simulated_success', 'simulated_failure', 'simulated_success', 'simulated_success', 'duplicate']);
  assert.deepEqual(result.state.tenants[0]?.completedSteps, ['create_workspace', 'configure_routing', 'launch']);
  assert.equal(result.decisions.filter(d => d.action?.step === 'create_workspace').length, 1);
});
test('missing prerequisites and human approval are separate holds', () => {
  assert.equal(runOnboarding({ tenants: [{ ...tenant, prerequisites: [] }], events: [event] }).decisions[0]?.reason, 'missing_prerequisite:intake_received');
  assert.equal(runOnboarding({ tenants: [{ ...tenant, approvals: [] }], events: [event] }).decisions[0]?.status, 'awaiting_approval');
});
test('the same event identity is independent across tenants', () => {
  const result = runOnboarding({ tenants: [tenant, { ...tenant, id: 'tenant-b' }], events: [event, { ...event, tenantId: 'tenant-b' }] });
  assert.equal(result.decisions.filter(d => d.action).length, 2);
  assert.notEqual(result.decisions[0]?.action?.idempotencyKey, result.decisions[1]?.action?.idempotencyKey);
});
test('a failed event receipt stays failed until an explicit successful simulated outcome', () => {
  const failed = runOnboarding({ tenants: [tenant], events: [{ ...event, outcome: 'failure' }, { ...event, outcome: 'failure' }] });
  assert.deepEqual(failed.state.tenants[0]?.completedSteps, []);
  assert.deepEqual(failed.decisions.map(d => d.status), ['simulated_failure', 'simulated_failure']);
});
test('state roundtrip prevents a completed side effect on another event', () => {
  const first = runOnboarding({ tenants: [tenant], events: [event] });
  const replay = runOnboarding({ ...first.state, events: [{ ...event, id: 'other-event' }] });
  assert.equal(replay.decisions[0]?.status, 'already_completed');
  assert.equal(replay.decisions[0]?.action, null);
});
test('malformed state and unknown steps fail clearly', () => {
  assert.throws(() => runOnboarding({ tenants: [tenant, tenant], events: [] }), /duplicate tenant/);
  assert.throws(() => runOnboarding({ tenants: [tenant], events: [{ ...event, step: 'buy_domains' }] }), /step/);
  assert.throws(() => runOnboarding({ tenants: [tenant], events: [{ ...event, outcome: 'unknown' }] }), /outcome/);
});
test('reused event id with another step is held even after a success', () => {
  const result = runOnboarding({ tenants: [tenant], events: [event, { ...event, step: 'configure_routing' }] });
  assert.equal(result.decisions[1]?.reason, 'event_identity_conflict');
  assert.equal(result.decisions[1]?.action, null);
});
