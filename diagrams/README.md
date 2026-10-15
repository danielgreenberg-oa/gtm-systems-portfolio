# Editable system maps

Each PNG is generated from the geometry and text in its paired `.excalidraw` scene. Open the scene in Excalidraw using **Open**, or drag it into an empty canvas. Rectangles, labels and bound arrows remain editable. No embedded client screenshots or remote assets are used.

The [overview](overview.png) organizes the operating system by business purpose. Each numbered board explains the corresponding chapter. The lower row names stored state, human gates and recovery outcomes. Color is redundant with the explicit category labels.

These are explanatory maps. They combine inspected source concepts with clearly labeled demo or proposed-policy details. They are not literal exports of deployed workflows. Follow the chapter for scope and dated evidence.

## Rebuild

Install Python 3.10 or newer, Pillow and Arial or DejaVu Sans, then run:

```sh
python3 -m pip install -r scripts/diagram-requirements.txt
python3 scripts/build_diagrams.py
```

[specs.json](specs.json) controls the text, nodes and routes. The builder writes both formats so previews cannot quietly drift from the editable source. A rebuild uses local fonts; different systems can produce small text-metric differences. Committed PNGs require no tooling to view in GitHub.

[Back to the catalog](../CATALOG.md)

## Board index

| Board | Preview | Editable | Explanation | Source |
|---|---|---|---|---|
| Overview | [PNG](overview.png) | [Scene](overview.excalidraw) | [Chapter](../README.md) | [Code / catalog](../CATALOG.md) |
| Script Factory | [PNG](script-factory.png) | [Scene](script-factory.excalidraw) | [Chapter](../systems/script-factory/README.md) | [Code / catalog](../src/script-factory.ts) |
| Onboarding | [PNG](onboarding.png) | [Scene](onboarding.excalidraw) | [Chapter](../systems/onboarding/README.md) | [Code / catalog](../src/onboarding.ts) |
| Context OS | [PNG](context-os.png) | [Scene](context-os.excalidraw) | [Chapter](../systems/context-os/README.md) | [Code / catalog](../artifacts/context-os/event-routing.ts) |
| Create CRM Lead | [PNG](crm-integration.png) | [Scene](crm-integration.excalidraw) | [Chapter](../systems/crm-integration/README.md) | [Code / catalog](../src/reconciliation.ts) |
| Reconciliation | [PNG](reconciliation.png) | [Scene](reconciliation.excalidraw) | [Chapter](../systems/reconciliation/README.md) | [Code / catalog](../src/reconciliation.ts) |
| Lead research | [PNG](lead-research.png) | [Scene](lead-research.excalidraw) | [Chapter](../systems/lead-research/README.md) | [Code / catalog](../artifacts/lead-research/offer-routing.ts) |
| Campaign infrastructure | [PNG](campaign-infrastructure.png) | [Scene](campaign-infrastructure.excalidraw) | [Chapter](../systems/campaign-infrastructure/README.md) | [Code / catalog](../artifacts/campaign-infrastructure/sequence-builder.py) |
| Call intelligence | [PNG](call-intelligence.png) | [Scene](call-intelligence.excalidraw) | [Chapter](../systems/call-intelligence/README.md) | [Code / catalog](../artifacts/call-intelligence/merge-context.ts) |
