# When bounded retries became an unbounded loop

**Historical incident: March 7, 2026.** The runtime was later retired. This account is checked against the retained incident decision record and the dated session log. Private identifiers and customer names are omitted.

## Failure

A lead-enrichment retry chain could not find its inbox reply. After three attempts it alerted an operator, but did not set the terminal database marker. A five-minute reconciler kept seeing the row as eligible and started another chain. A bounded retry loop became unbounded at the system level.

The retained record describes hundreds of runs from one row. It records more than $200 in model usage during the extended debugging session and more than $20 in orchestration compute. These are historical recorded cost boundaries, not a new billing audit or a claim that all model usage came from the loop alone.

## What changed

The recorded version chronology matters:

1. Version .1 added exhaustion and scheduling-failure markers.
2. Version .2 checked the marker before retry work.
3. Version .3 added a zero-API-call kill switch to drain queued work.
4. Version .4 removed the kill switch after draining and added a two-hour age limit, four-retrigger cap and batch idempotency check.

Containment first is the lesson for a future incident. It was not the actual first deployed change here.

## Verification and incomplete recovery

The final recorded reconciler check inspected **13 records**, found **0 missed records** and retriggered **0**. The log reported no remaining zombie runs.

Backlog processing had a different scope: **12 runs**, with **7 delivered, 4 failed and 1 skipped through idempotency**. That was partial recovery. Stopping the loop did not make every enrichment succeed.

## Operating lesson

Success, skip and terminal failure need explicit state. An alert does not terminate work. Reconciliation must share the same terminal state and budget boundaries as the worker it can restart.

Daniel owned operating requirements and production decisions. Claude implemented the changes. This account does not claim line-by-line authorship or convert historical logs into a current reliability guarantee.

[Run the reconciliation example](../systems/reconciliation/README.md) · [Inspect the claim pattern](../artifacts/atomic-claim.sql) · [Evidence E10](../evidence/README.md#e10)
