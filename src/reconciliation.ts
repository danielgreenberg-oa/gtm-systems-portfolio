import { choice, identity, integer, list, object, text } from './validation.ts';

/** Artifact: synthetic sequential CRM stage-sync model, not a live CRM integration.
 * Production requires atomic durable claims and native receipt reconciliation.
 * This model does not prove concurrent-worker safety or distributed exactly-once delivery.
 */
const stages = ['new', 'engaged', 'qualified', 'closed'] as const;
export type Stage = typeof stages[number];
export interface CanonicalRecord { tenantId: string; contactId: string; stage: Stage; version: number; owner: 'automation' | 'human' | 'crm' }
export interface ReconciliationEvent { tenantId: string; id: string; contactId: string; stage: Stage; version: number; source: 'webhook' | 'recovery'; outcome: 'success' | 'failure' | 'pending' }
export interface ReconciliationReceipt { tenantId: string; eventId: string; contactId: string; stage: Stage; version: number; expectedVersion: number; attempts: number; status: 'pending' | 'failed' | 'completed' | 'exhausted' }
export interface ReconciliationState { records: CanonicalRecord[]; receipts: ReconciliationReceipt[] }
export interface ReconciliationAction { kind: 'proposed_crm_stage_sync'; tenantId: string; eventId: string; contactId: string; stage: Stage; version: number; expectedVersion: number; attempt: number; idempotencyKey: string }
export interface Classification { status: 'ready' | 'held' | 'duplicate' | 'older' | 'already_current' | 'pending' | 'exhausted'; reason: string }
export interface ReconciliationDecision { tenantId: string; eventId: string; status: Classification['status'] | 'simulated_completed' | 'failed'; reason: string; action: ReconciliationAction | null }
export interface ReconciliationResult { artifact: 'synthetic-offline-demo'; trace: string[]; state: ReconciliationState; decisions: ReconciliationDecision[] }

export function parseReconciliationInput(value: unknown): { state: ReconciliationState; events: ReconciliationEvent[]; maxAttempts: number } {
  const input = object(value, 'input');
  const maxAttempts = integer(input.maxAttempts, 'maxAttempts', 1, 20);
  const state = object(input.state, 'state');
  const records = list(state.records, 'state.records').map((item): CanonicalRecord => {
    const record = object(item, 'record');
    return { tenantId: text(record.tenantId, 'tenantId'), contactId: text(record.contactId, 'contactId'), stage: choice(record.stage, stages, 'stage'), version: integer(record.version, 'version', 0, Number.MAX_SAFE_INTEGER), owner: choice(record.owner, ['automation', 'human', 'crm'], 'owner') };
  });
  const receipts = list(state.receipts, 'state.receipts').map((item): ReconciliationReceipt => {
    const receipt = object(item, 'receipt');
    const status = choice(receipt.status, ['pending', 'failed', 'completed', 'exhausted'], 'receipt.status');
    const attempts = integer(receipt.attempts, 'attempts', status === 'completed' ? 0 : 1, maxAttempts);
    if (status === 'failed' && attempts >= maxAttempts) throw new Error('failed receipt at attempt limit must be exhausted');
    if (status === 'exhausted' && attempts !== maxAttempts) throw new Error('exhausted receipt must reach maxAttempts');
    return { tenantId: text(receipt.tenantId, 'receipt.tenantId'), eventId: text(receipt.eventId, 'receipt.eventId'), contactId: text(receipt.contactId, 'receipt.contactId'), stage: choice(receipt.stage, stages, 'receipt.stage'), version: integer(receipt.version, 'receipt.version', 0, Number.MAX_SAFE_INTEGER), expectedVersion: integer(receipt.expectedVersion, 'expectedVersion', 0, Number.MAX_SAFE_INTEGER), status, attempts };
  });
  if (new Set(records.map(r => identity(r.tenantId, r.contactId))).size !== records.length) throw new Error('duplicate canonical identity');
  if (new Set(receipts.map(r => identity(r.tenantId, r.eventId))).size !== receipts.length) throw new Error('duplicate receipt identity');
  const events = list(input.events, 'events').map((item): ReconciliationEvent => {
    const event = object(item, 'event');
    return { tenantId: text(event.tenantId, 'tenantId'), id: text(event.id, 'event.id'), contactId: text(event.contactId, 'contactId'), stage: choice(event.stage, stages, 'stage'), version: integer(event.version, 'version', 0, Number.MAX_SAFE_INTEGER), source: choice(event.source, ['webhook', 'recovery'], 'source'), outcome: choice(event.outcome, ['success', 'failure', 'pending'], 'outcome') };
  });
  return { maxAttempts, state: { records, receipts }, events };
}
function receiptFor(state: ReconciliationState, event: Pick<ReconciliationEvent, 'tenantId' | 'id'>): ReconciliationReceipt | undefined {
  return state.receipts.find(r => r.tenantId === event.tenantId && r.eventId === event.id);
}
export function classifyReconciliation(state: ReconciliationState, event: ReconciliationEvent, maxAttempts: number): Classification {
  const receipt = receiptFor(state, event);
  if (receipt && (receipt.contactId !== event.contactId || receipt.version !== event.version || receipt.stage !== event.stage)) return { status: 'held', reason: 'event_identity_conflict' };
  if (receipt?.status === 'completed') return { status: 'duplicate', reason: 'completed_event_receipt' };
  if (receipt?.status === 'pending') return { status: 'pending', reason: 'native_receipt_required_before_retry' };
  if (receipt?.status === 'exhausted' || (receipt && receipt.attempts >= maxAttempts)) return { status: 'exhausted', reason: 'terminal_attempt_limit' };
  const record = state.records.find(r => r.tenantId === event.tenantId && r.contactId === event.contactId);
  if (!record) return { status: 'held', reason: 'unknown_identity' };
  if (event.version < record.version) return { status: 'older', reason: 'older_than_canonical_version' };
  if (record.owner !== 'automation') return { status: 'held', reason: 'canonical_owner_conflict' };
  if (event.version === record.version && event.stage !== record.stage) return { status: 'held', reason: 'same_version_conflict' };
  // A second event must not overlap a still-unconfirmed action for this contact.
  if (state.receipts.some(r => r.tenantId === event.tenantId && r.contactId === event.contactId && r.status === 'pending')) return { status: 'pending', reason: 'contact_has_unconfirmed_action' };
  if (event.stage === record.stage) return { status: 'already_current', reason: 'no_external_change_needed' };
  return { status: 'ready', reason: event.source === 'recovery' ? 'missed_webhook_recovery' : 'newer_event' };
}
export function planReconciliation(state: ReconciliationState, event: ReconciliationEvent, maxAttempts: number): { state: ReconciliationState; decision: ReconciliationDecision; action: ReconciliationAction | null } {
  const classification = classifyReconciliation(state, event, maxAttempts);
  const decision: ReconciliationDecision = { tenantId: event.tenantId, eventId: event.id, ...classification, action: null };
  const next = structuredClone(state);
  if (classification.status !== 'ready' && classification.status !== 'already_current') return { state: next, decision, action: null };
  const record = next.records.find(r => r.tenantId === event.tenantId && r.contactId === event.contactId);
  if (!record) throw new Error('canonical identity disappeared');
  const prior = receiptFor(next, event);
  const attempts = classification.status === 'already_current' ? (prior?.attempts ?? 0) : (prior?.attempts ?? 0) + 1;
  next.receipts = next.receipts.filter(r => !(r.tenantId === event.tenantId && r.eventId === event.id));
  next.receipts.push({ tenantId: event.tenantId, eventId: event.id, contactId: event.contactId, stage: event.stage, version: event.version, expectedVersion: record.version, attempts, status: classification.status === 'already_current' ? 'completed' : 'pending' });
  if (classification.status === 'already_current') {
    record.version = event.version;
    return { state: next, decision, action: null };
  }
  const action: ReconciliationAction = { kind: 'proposed_crm_stage_sync', tenantId: event.tenantId, eventId: event.id, contactId: event.contactId, stage: event.stage, version: event.version, expectedVersion: record.version, attempt: attempts, idempotencyKey: identity(event.tenantId, event.contactId, String(event.version), event.stage) };
  decision.action = action;
  return { state: next, decision, action };
}
export function acknowledgeReconciliation(state: ReconciliationState, action: ReconciliationAction, outcome: 'success' | 'failure' | 'pending', maxAttempts: number): ReconciliationState {
  const next = structuredClone(state);
  const receipt = next.receipts.find(r => r.tenantId === action.tenantId && r.eventId === action.eventId);
  const expectedKey = identity(action.tenantId, action.contactId, String(action.version), action.stage);
  if (!receipt || receipt.status !== 'pending' || receipt.attempts !== action.attempt || receipt.contactId !== action.contactId || receipt.version !== action.version || receipt.stage !== action.stage || receipt.expectedVersion !== action.expectedVersion || action.idempotencyKey !== expectedKey) throw new Error('stale action or claim mismatch');
  const record = next.records.find(r => r.tenantId === action.tenantId && r.contactId === action.contactId);
  if (!record || record.owner !== 'automation' || record.version !== action.expectedVersion) throw new Error('canonical state changed; reconcile native receipt before acknowledging');
  if (outcome === 'success') {
    record.stage = action.stage; record.version = action.version; receipt.status = 'completed';
  } else if (outcome === 'failure') {
    receipt.status = receipt.attempts >= maxAttempts ? 'exhausted' : 'failed';
  }
  return next;
}
export function runReconciliation(value: unknown): ReconciliationResult {
  const input = parseReconciliationInput(value);
  let state = input.state;
  const decisions: ReconciliationDecision[] = [];
  const trace = ['Sequential in-memory simulation. Stage sync is illustrative; no CRM calls occur. Production uses atomic durable claims and native receipts. This does not prove concurrent workers or distributed exactly-once. maxAttempts includes the initial attempt per stable tenant/event identity.'];
  for (const event of input.events) {
    const planned = planReconciliation(state, event, input.maxAttempts);
    state = planned.state;
    if (planned.action) {
      state = acknowledgeReconciliation(state, planned.action, event.outcome, input.maxAttempts);
      const receipt = receiptFor(state, event);
      planned.decision.status = receipt?.status === 'completed' ? 'simulated_completed' : receipt?.status === 'exhausted' ? 'exhausted' : receipt?.status === 'failed' ? 'failed' : 'pending';
      planned.decision.reason = event.outcome === 'success' ? 'fixture_acknowledgment_only' : event.outcome === 'pending' ? 'unconfirmed_action_no_completion' : 'fixture_failure_no_completion';
    }
    decisions.push(planned.decision);
    trace.push(`${event.tenantId}/${event.id} (${event.source}): ${planned.decision.status} (${planned.decision.reason}).`);
  }
  return { artifact: 'synthetic-offline-demo', trace, state, decisions };
}
