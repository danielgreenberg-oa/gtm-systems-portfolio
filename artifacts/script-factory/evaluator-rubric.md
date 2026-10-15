# Evaluation rubric

Classification: simplified demonstration. The demo reads a fixture evaluator verdict; this document explains the human-readable review lens.

| Check | Review question | Failure treatment |
|---|---|---|
| Offer fidelity | Does the copy stay within the approved commitment? | Reject unsupported claims |
| Segment fit | Is the audience the segment tied to that offer? | Reject wrong audience |
| Clarity | Can the reader identify the promised outcome and next step? | Give specific revision feedback |
| Voice | Does the wording respect the provided terminology and exclusions? | Name the offending wording |
| CTA | Is the requested next step clear and appropriate to the offer? | Request a concrete revision |

Deterministic checks and evaluator verdicts are separate signals. A fixture pass only proves control flow. It does not validate model quality or a real business outcome. Generation has a bounded attempt budget; exhaustion returns a terminal result.
