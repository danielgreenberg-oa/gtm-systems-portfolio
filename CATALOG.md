# System catalog

This catalog maps the operating system by business purpose. **Implemented** means implementation is present in inspected source; it does not establish current activation. **Historical** describes a dated operating capability. **Proposed** means this portfolio has design material without deployment proof.

| Business purpose | Capability | Evidence state | Portfolio home |
|---|---|---|---|
| Find accounts | ICP inputs, enrichment handoffs, deterministic qualification and segmentation | Implemented source | [Lead research](systems/lead-research/README.md) |
| Prepare offers | Approved offers, segment commitments, voice and copy rules | Implemented source | [Script Factory](systems/script-factory/README.md) |
| Produce copy | BOM, generation, programmatic guards, evaluator, bounded revisions, versioned output | Implemented source | [Script Factory](systems/script-factory/README.md) |
| Personalize at delivery | Tenant-specific offer selection and copy pools | Implemented source | [Lead research](systems/lead-research/README.md) |
| Start service | Intake, payment prerequisite, provisioning, manual gates, resumption and QA | Implemented source | [Onboarding](systems/onboarding/README.md) |
| Operate delivery | Domains, mailboxes, sender readiness, campaign assembly, warmup and health scripts | Implemented source; activation not checked | [Campaign infrastructure](systems/campaign-infrastructure/README.md) |
| Handle engagement | Reply ingest, classification, email/LinkedIn suppression and review handoff | Implemented source | [Context OS](systems/context-os/README.md) |
| Extend channels | Older SMS and phone coordination tiers | Proposed in historical architecture; deployment unverified here | [Context OS limits](systems/context-os/README.md) |
| Maintain CRM | Contact identity, notes, tasks, stage synchronization and destination scoping | Implemented source; behavior is route-specific | [CRM integration](systems/crm-integration/README.md) |
| Coordinate meetings | Booking events, calendar sync, suppression and follow-up state | Implemented source | [Context OS](systems/context-os/README.md) |
| Reuse calls | Ingest, extraction, layered context, approved commitments and copy-rule updates | Implemented source | [Call intelligence](systems/call-intelligence/README.md) |
| Recover missed work | Webhook backfill, reconciliation, leases, terminal markers and recovery audits | Implemented source | [Reliability](systems/reconciliation/README.md) |
| Support the operator | Dashboard/portal views, task board, health and heartbeat reports | Implemented source; telemetry freshness varies | [Reliability](systems/reconciliation/README.md) |
| Handle commercial setup | Contract generation, signature/payment events, onboarding handoff | Implemented source; transaction status not checked | [Onboarding](systems/onboarding/README.md) |
| Maintain shared knowledge | Search/indexing, source updates, document generation and review workflows | Implemented source | [Call intelligence](systems/call-intelligence/README.md) |
| Maintain back office | Financial sync/reporting, maintenance, drift checks and security audits | Source inventory only; not a public operational health claim | [Evidence E09](evidence/README.md#e09) |
| Previous runtime | Trigger.dev orchestration before the n8n migration | Historical; retired runtime | [Retry incident](case-studies/retry-loop.md) |
| Historical offer | OA cold-email service acquisition | Historical; retired July 2026 | [Context](README.md) |

The March registry, April migration documentation and June business report served different purposes. This portfolio combines their useful levels: a navigable catalog, system-level explanations and selected implementation evidence. Fleet counts and old status cards are deliberately not used as current health claims.
