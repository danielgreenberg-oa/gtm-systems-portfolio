# Synthetic offline fixtures

These inputs and outcome numbers are invented for the portfolio. They are not client records or measured performance. The CLI reads local JSON, prints a readable trace, then prints the full JSON result after `JSON result:`. No service is provisioned and no CRM is contacted.

```sh
npm run demo:script-factory
npm run demo:onboarding -- examples/onboarding/approval-gate.json
npm run demo:reconciliation -- examples/reconciliation/pending.json
```

Each directory has `input.json` as its default scenario and `expected.json` as its expected decision contract. Other scenarios pair `name.json` with `name.expected.json`. Expected contracts are hand-authored subsets of the full result: every listed field must match, and listed arrays must have the exact expected length. They omit verbose trace text and some action details. Behavioral tests separately exercise acknowledgment, resume, tenant isolation, malformed input and stale claims.

| Demo | Input | Result | Cases |
| --- | --- | --- | --- |
| Script Factory | Approved `offer` with segment-bound `claims`, target `segment`, `maxAttempts`, ordered fixture `candidates` with evaluator verdict/feedback | Hold, exhausted attempts, or passing local package | Revise then pass, missing approval, exhausted evaluator revisions, unsupported claim, segment mismatch |
| Onboarding | `tenants` state and `events` with fixture outcomes | Updated serializable state, proposed action decisions, simulated outcome trace | Partial completion and resume, missing prerequisite, human approval gate, completed duplicate |
| Reconciliation | `maxAttempts`, canonical `state.records`, `state.receipts`, incoming `events` | Updated state and separate classification/planning/acknowledgment decisions | Missed webhook recovery and duplicate, retry exhaustion, pending receipt, human conflict, CRM conflict, unknown identity, older event |

For Script Factory, `maxAttempts` includes the initial candidate evaluation. Fewer supplied candidates end the run early with `candidate_supply_exhausted`. A passing fixture evaluator cannot override deterministic guards. The numeric guard matches whole approved phrases and rejects remaining digits; it is a deliberately limited demonstration, not semantic fact checking or complete production guard parity.

Onboarding steps are `create_workspace`, `configure_routing`, and `launch`. Workspace creation needs `intake_received`. The first two steps need `provisioning_approved`; launch needs `launch_approved`. Acknowledged completed steps are retained within tenant state; action keys include tenant identity. Persist the returned `state` and pass it back as `tenants` to resume. Fixture `outcome` values simulate external acknowledgments only.

Reconciliation stages and stage-sync actions are illustrative. `maxAttempts` includes the initial attempt per stable tenant/event identity. A failed action can retry, a completed event cannot repeat an action, and an unconfirmed action remains pending until its exact acknowledgment is reconciled. A new event cannot bypass another pending action for that contact. A newer event already matching the canonical stage advances the local version without a proposed external action. Human and CRM owners cause conflict holds. Persist returned `state` to resume; use the exported acknowledgment function with the original action to resolve a pending result.

Both stateful demos are sequential in-memory simulations. Returned JSON supports caller-managed persistence; the demos do not write a durable database. Production needs atomic durable claims, provider idempotency and native receipt reconciliation. These tests do not establish concurrent-worker safety, distributed exactly-once delivery or live integration correctness.
