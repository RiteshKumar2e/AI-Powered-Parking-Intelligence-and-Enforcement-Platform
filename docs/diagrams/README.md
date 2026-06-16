# Diagrams

All architecture, ER, and sequence diagrams are authored inline as **Mermaid** code blocks within the design docs (they render natively on GitHub), so no external diagram tooling is required.

| Diagram | Lives in |
| --- | --- |
| Layered component architecture | [02-HLD §2](../02-HLD-high-level-design.md#2-layered-component-architecture) |
| End-to-end data flow (sequence) | [02-HLD §4](../02-HLD-high-level-design.md#4-end-to-end-data-flow) |
| Scalability / deployment | [02-HLD §5](../02-HLD-high-level-design.md#5-scalability--deployment) |
| Security & privacy flow | [02-HLD §6](../02-HLD-high-level-design.md#6-security--privacy-nfr-6711) |
| Database ER diagram | [03-LLD §2.1](../03-LLD-low-level-design.md#21-entity-relationship-diagram) |
| CV pipeline | [03-LLD §3](../03-LLD-low-level-design.md#3-cv-pipeline-internals-fr-1) |
| LPR/OCR pipeline | [03-LLD §4](../03-LLD-low-level-design.md#4-lpr--ocr-pipeline-fr-2) |
| Hotspot heatmap flow | [03-LLD §6](../03-LLD-low-level-design.md#6-hotspot-heatmap-generation-fr-5) |
| Prediction flow | [03-LLD §7](../03-LLD-low-level-design.md#7-prediction-model-design-fr-6) |
| Sequence: live violation → report | [03-LLD §9.1](../03-LLD-low-level-design.md#91-live-violation--report) |
| Sequence: dashboard search | [03-LLD §9.2](../03-LLD-low-level-design.md#92-dashboard-search-query) |
| Sequence: nightly prediction + batch | [03-LLD §9.3](../03-LLD-low-level-design.md#93-nightly-prediction--summary-batch) |
| Dashboard information architecture | [04-page-structure §1](../04-page-structure-and-ui.md#1-information-architecture) |
| Phased roadmap | [05-implementation-plan §1](../05-implementation-plan.md#1-phased-roadmap) |
| CI/CD pipeline | [05-implementation-plan §4](../05-implementation-plan.md#4-cicd--deployment) |

If standalone `.mmd` source files are extracted later for a static-site build, place them here mirroring the section names above.
