import { choice, identity, list, object, strings, text } from './validation.ts';

/** Artifact: synthetic sequential planner. It proposes actions; it never provisions services. */
const steps = ['create_workspace', 'configure_routing', 'launch'] as const;
export type Step = typeof steps[number];
export interface OnboardingReceipt { eventId: string; step: Step; status: 'success' | 'failure' }
export interface TenantState { id: string; prerequisites: string[]; approvals: string[]; completedSteps: Step[]; receipts: OnboardingReceipt[] }
export interface OnboardingState { tenants: TenantState[] }
export interface OnboardingEvent { tenantId: string; id: string; step: Step; outcome: 'success' | 'failure' }
export interface OnboardingAction { tenantId: string; eventId: string; step: Step; idempotencyKey: string; kind: 'proposed_external_action' }
export interface OnboardingDecision { tenantId: string; eventId: string; status: 'proposed' | 'held' | 'awaiting_approval' | 'duplicate' | 'already_completed' | 'simulated_success' | 'simulated_failure'; reason: string; action: OnboardingAction | null }
export interface OnboardingResult { artifact: 'synthetic-offline-demo'; trace: string[]; state: OnboardingState; decisions: OnboardingDecision[] }

export function parseOnboardingInput(value: unknown): OnboardingState & { events: OnboardingEvent[] } {
  const input = object(value, 'input');
  const tenants = list(input.tenants, 'tenants').map((item): TenantState => {
    const tenant = object(item, 'tenant');
    const receipts = list(tenant.receipts, 'receipts').map((item): OnboardingReceipt => {
      const receipt = object(item, 'receipt');
      return { eventId: text(receipt.eventId, 'receipt.eventId'), step: choice(receipt.step, steps, 'receipt.step'), status: choice(receipt.status, ['success', 'failure'], 'receipt.status') };
    });
    const completedSteps = list(tenant.completedSteps, 'completedSteps').map(step => choice(step, steps, 'completedSteps'));
    if (new Set(completedSteps).size !== completedSteps.length) throw new Error('duplicate completed step');
    if (new Set(receipts.map(r => r.eventId)).size !== receipts.length) throw new Error('duplicate receipt eventId');
    if (receipts.some(r => r.status === 'success' && !completedSteps.includes(r.step))) throw new Error('successful receipt requires completed step');
    return { id: text(tenant.id, 'tenant.id'), prerequisites: strings(tenant.prerequisites, 'prerequisites'), approvals: strings(tenant.approvals, 'approvals'), completedSteps, receipts };
  });
  if (new Set(tenants.map(t => t.id)).size !== tenants.length) throw new Error('duplicate tenant id');
  const events = list(input.events, 'events').map((item): OnboardingEvent => {
    const event = object(item, 'event');
    return { tenantId: text(event.tenantId, 'tenantId'), id: text(event.id, 'event.id'), step: choice(event.step, steps, 'step'), outcome: choice(event.outcome, ['success', 'failure'], 'outcome') };
  });
  return { tenants, events };
}
export function planOnboarding(state: OnboardingState, event: OnboardingEvent): OnboardingDecision {
  const decision: OnboardingDecision = { tenantId: event.tenantId, eventId: event.id, status: 'held', reason: '', action: null };
  const tenant = state.tenants.find(t => t.id === event.tenantId);
  if (!tenant) return { ...decision, reason: 'unknown_tenant' };
  const receipt = tenant.receipts.find(r => r.eventId === event.id);
  if (receipt && receipt.step !== event.step) return { ...decision, reason: 'event_identity_conflict' };
  if (receipt?.status === 'success') return { ...decision, status: 'duplicate', reason: 'completed_event_receipt' };
  if (tenant.completedSteps.includes(event.step)) return { ...decision, status: 'already_completed', reason: 'durable_completed_step' };
  const requirement = event.step === 'create_workspace' ? 'intake_received' : event.step === 'configure_routing' ? 'create_workspace' : 'configure_routing';
  const ready = event.step === 'create_workspace' ? tenant.prerequisites.includes(requirement) : tenant.completedSteps.includes(requirement as Step);
  if (!ready) return { ...decision, reason: `missing_prerequisite:${requirement}` };
  const approval = event.step === 'launch' ? 'launch_approved' : 'provisioning_approved';
  if (!tenant.approvals.includes(approval)) return { ...decision, status: 'awaiting_approval', reason: `human_approval_required:${approval}` };
  return { ...decision, status: 'proposed', reason: 'prerequisites_and_approval_verified', action: { tenantId: tenant.id, eventId: event.id, step: event.step, idempotencyKey: identity(tenant.id, event.step), kind: 'proposed_external_action' } };
}
export function acknowledgeOnboarding(state: OnboardingState, action: OnboardingAction, outcome: 'success' | 'failure'): OnboardingState {
  const next = structuredClone(state);
  const tenant = next.tenants.find(t => t.id === action.tenantId);
  if (!tenant) throw new Error('cannot acknowledge unknown tenant');
  const expected = planOnboarding(state, { tenantId: action.tenantId, id: action.eventId, step: action.step, outcome });
  if (expected.status !== 'proposed' || expected.action?.idempotencyKey !== action.idempotencyKey) throw new Error('cannot acknowledge a stale or unapproved action');
  tenant.receipts = tenant.receipts.filter(r => r.eventId !== action.eventId);
  tenant.receipts.push({ eventId: action.eventId, step: action.step, status: outcome });
  if (outcome === 'success') tenant.completedSteps.push(action.step);
  return next;
}
export function runOnboarding(value: unknown): OnboardingResult {
  const input = parseOnboardingInput(value);
  let state: OnboardingState = { tenants: input.tenants };
  const decisions: OnboardingDecision[] = [];
  const trace = ['Sequential offline simulation. Actions are proposed only; fixture outcomes simulate acknowledgments. Persist returned state to resume. Production needs atomic durable claims.'];
  for (const event of input.events) {
    const decision = planOnboarding(state, event);
    if (decision.action) {
      state = acknowledgeOnboarding(state, decision.action, event.outcome);
      decision.status = event.outcome === 'success' ? 'simulated_success' : 'simulated_failure';
      decision.reason = event.outcome === 'success' ? 'fixture_acknowledgment_only' : 'failed_step_remains_retryable';
    }
    decisions.push(decision);
    trace.push(`${event.tenantId}/${event.id}: ${event.step} -> ${decision.status} (${decision.reason}).`);
  }
  return { artifact: 'synthetic-offline-demo', trace, state, decisions };
}
