# Field ownership in the local example

Classification: proposed pattern used to explain the simplified CRM demo. This is not a complete production mapping.

| Field or fact | Authority | Conflict behavior |
|---|---|---|
| Tenant and lead identity | Validated canonical binding | Hold mismatches |
| Event identity and received time | Native source event | Reject older or duplicate work as appropriate |
| Human-owned opportunity decision | Named CRM owner | Hold an automated overwrite for review |
| Proposed context change | Decision planner | No completion claim until acknowledgement |
| Completed external action | Vendor receipt plus local record | Replay is a no-op for that action |

Current source inspection also establishes a narrower real route: lender replies write contact context to GHL and avoid a borrower opportunity pipeline. That route-specific choice should survive any future CRM migration.
