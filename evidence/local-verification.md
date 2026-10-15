# Local verification

Recorded **2026-10-15**, using Node 24.18.1 and Python 3. These results concern the code in this repository, not production systems.

`npm run verify` passed strict TypeScript checking, **48 demo tests**, **5 excerpt behavior checks**, **4 Python checks**, local Markdown link checks, and checks for all **8 chapters**, **9 editable scenes** and **9 PNG previews**. The PNGs were visually inspected. The scene checks verify IDs, bound elements, text containment and preview dimensions. They are not a claim of a completed native editor import test.

The fixture suite has **16 input/expected pairs**. Expected files are hand-authored contracts for selected fields, not full stdout snapshots. Tests also compare complete repeated results for determinism. GitHub Actions runs the same verification on Node 22.18.0 and 24; inspect the actual check result on the revision being reviewed.

## Read the default runs

| Demo | Recorded trace | Outcome |
|---|---|---|
| Script Factory | [Trace](traces/script-factory.txt) | First evaluator fixture requests revision; attempt 2 packages |
| Onboarding | [Trace](traces/onboarding.txt) | Failed routing resumes; completed workspace does not repeat |
| Context/CRM reconciliation | [Trace](traces/reconciliation.txt) | Recovery acknowledges one change; webhook duplicate skips |

These traces were captured from the default CLI commands. They are generated evidence, not independent expected contracts. Model responses and external outcomes are supplied fixtures. No credentials, external API requests, provisioning, campaign activation or CRM writes occur.

The export validator also checks common credential signatures and private source markers. That limited scan supplements manual curation; it is not proof that an arbitrary repository contains no sensitive data.
