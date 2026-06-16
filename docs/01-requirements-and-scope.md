# 01 · Requirements & Scope

← Back to [README](README.md) · Next: [02 HLD](02-HLD-high-level-design.md)

This document is the **source of truth for what the system must do**. Every functional requirement (FR) and non-functional requirement (NFR) has a stable ID so the HLD, LLD, API spec, and implementation plan can trace back to it.

---

## 1. Personas & Roles

| Persona | Goal | Primary screens |
| --- | --- | --- |
| **Traffic Admin** | Configure cameras/zones, manage users, oversee system | Admin, Settings, all dashboards |
| **Enforcement Officer** | Act on violations, issue/confirm tickets | Violations, Violation Detail, Live Monitoring |
| **Traffic Analyst** | Study trends, congestion, hotspots, plan deployments | Congestion Analytics, Hotspots, Predictions, Reports |
| **Viewer / Auditor** | Read-only oversight, audit trails | Overview, Reports, Search |

Role-based access (RBAC) is enforced at the API layer; see access matrix in [04-page-structure-and-ui.md](04-page-structure-and-ui.md#role-based-access-matrix).

---

## 2. Functional Requirements

### FR-1 — Illegal-Parking Detection
- **FR-1.1** Ingest images and video (RTSP streams + file/image upload) from traffic cameras.
- **FR-1.2** Detect vehicles (car, bike, auto-rickshaw, truck, bus) with bounding boxes and class + confidence.
- **FR-1.3** Track vehicles across frames to compute **dwell time** (stationary duration).
- **FR-1.4** Classify a vehicle as **illegally parked** when it is *stationary beyond a configurable threshold* **and** located inside a restricted **zone**.
- **FR-1.5** Support zone types: **no-parking**, **near-intersection**, **metro-station proximity**, **commercial-hub**, **event-zone** (time-bounded).
- **FR-1.6** Each detection records camera ID, timestamp, geolocation, zone, vehicle class, confidence.

### FR-2 — License Plate Recognition (LPR/OCR)
- **FR-2.1** Localize the number-plate region within a detected vehicle crop.
- **FR-2.2** OCR the plate to a registration string.
- **FR-2.3** Normalize/validate against **Indian plate format** (e.g. `KA01AB1234`) via regex + post-processing.
- **FR-2.4** Emit a confidence score; route low-confidence reads to a **manual-review** queue.

### FR-3 — Annotated Visual Evidence
- **FR-3.1** Produce an annotated image (bounding box, plate, class) with a **timestamp + location overlay**.
- **FR-3.2** Persist evidence (image, and optionally short clip) in object storage with an immutable reference.
- **FR-3.3** Maintain an evidence ↔ violation link and an audit trail (who viewed/changed what).

### FR-4 — Traffic Density & Congestion Scoring
- **FR-4.1** Compute per-frame traffic density (vehicle count) and **road-occupancy ratio** (occupied area / drivable area).
- **FR-4.2** Compute a normalized **congestion score (0–100)** per camera/segment combining density, occupancy, lane blockage, and flow.
- **FR-4.3** Attribute an **illegal-parking congestion contribution** (how much a parked vehicle worsens the score).
- **FR-4.4** Persist congestion metrics as time-series for trend analysis.

### FR-5 — Hotspot Heatmaps
- **FR-5.1** Aggregate violations + congestion over a geo-grid and time window.
- **FR-5.2** Serve a heatmap layer (intensity per cell) to the dashboard map.
- **FR-5.3** Support a time slider (replay heatmap evolution) and filters (zone type, vehicle class, severity).

### FR-6 — Predictive Hotspot Forecasting & Recommendations
- **FR-6.1** Train on historical + live data to predict **hotspot probability** per zone/time-bucket.
- **FR-6.2** Surface forecasts for upcoming windows (e.g. next 1–24 h).
- **FR-6.3** Generate **targeted enforcement recommendations** (where/when to deploy officers).

### FR-7 — LLM Reporting & Decision Support (Claude)
- **FR-7.1** Generate a human-readable **violation report** per violation (or batch).
- **FR-7.2** Generate periodic **enforcement summaries** (daily/weekly) aggregating stats and trends.
- **FR-7.3** Generate **decision-support insights** (narrative of hotspots, causes, recommended actions).
- **FR-7.4** Reports must be grounded in structured data (no fabrication); include source references.
- **FR-7.5** Export reports as PDF/CSV.

### FR-8 — Interactive Dashboard
- **FR-8.1** KPI overview (total violations, active hotspots, live congestion index, today's enforcement).
- **FR-8.2** Searchable/filterable violation records (by plate, location, date, zone, status).
- **FR-8.3** Congestion trend charts and hotspot heatmap views.
- **FR-8.4** Predictions & recommendations view.
- **FR-8.5** Live monitoring of camera feeds + real-time detections.
- **FR-8.6** Auth, RBAC, and admin configuration of cameras/zones/users.

---

## 3. Non-Functional Requirements

| ID | Category | Requirement |
| --- | --- | --- |
| **NFR-1** | Accuracy | Vehicle detection mAP ≥ 0.85; OCR field-level accuracy ≥ 90% on clear plates; congestion-score MAE within target band (see [07](07-data-and-ml-models.md)). |
| **NFR-2** | Latency | Per-frame inference (detect+track) < ~200 ms on GPU worker; violation event → dashboard < ~5 s; live feed glass-to-glass best-effort. |
| **NFR-3** | Throughput | Horizontally scale to **N concurrent camera streams** (pilot target configurable, e.g. 50–500) via worker autoscaling on queue depth. |
| **NFR-4** | Scalability | Stateless API + queue-decoupled ML workers; GPU node pools scale independently of API/DB. |
| **NFR-5** | Availability | Target ≥ 99.5% for API/dashboard; no single point of failure; graceful degradation if ML workers lag (queue buffers). |
| **NFR-6** | Security & Privacy | Plate text is **PII** — encryption at rest & in transit, RBAC, configurable **data-retention** & purge policy, full audit logging. |
| **NFR-7** | Auditability | Every enforcement-relevant action (view evidence, change status, generate report) is logged immutably. |
| **NFR-8** | Observability | Metrics (Prometheus), dashboards (Grafana), centralized logs, ML model-drift monitoring. |
| **NFR-9** | Cost | Control GPU spend (frame sampling, batch inference); control LLM spend (prompt caching, Batch API for nightly runs, effort tuning). |
| **NFR-10** | Maintainability | Modular microservices, typed contracts (OpenAPI), CI/CD, model versioning/registry. |
| **NFR-11** | Legality/Compliance | Evidence chain-of-custody suitable for enforcement; human-in-the-loop confirmation before penal action. |

---

## 4. Out of Scope (this phase)

- Automatic ticket *payment* collection / integration with court systems.
- Mobile native apps (dashboard is responsive web first).
- Vehicle owner identity lookup against RTO databases (assumed external integration, stubbed).
- In-camera/edge model deployment beyond frame-sampling gateway (cloud inference assumed for the pilot).

## 5. Assumptions

- Cameras provide RTSP or periodic image snapshots with known **geolocation** and **calibration** (for zone mapping).
- Zones/geofences are defined by an admin on a map (one-time + ongoing).
- A human officer confirms violations before any penal action (NFR-11).
- GPU compute (cloud or on-prem) is available for ML workers.
- An Anthropic API key is provisioned for the LLM reporting module.

## 6. Requirement → Design Traceability (overview)

| FR group | HLD section | LLD section | API group | UI page |
| --- | --- | --- | --- | --- |
| FR-1 Detection | Ingestion + ML services | CV pipeline | `/detections`,`/violations` | Live Monitoring, Violations |
| FR-2 LPR | LPR service | LPR/OCR pipeline | `/plates` | Violation Detail |
| FR-3 Evidence | Data layer (S3) | Evidence schema | `/violations`,`/evidence` | Violation Detail |
| FR-4 Congestion | Congestion service | Scoring algorithm | `/congestion` | Congestion Analytics |
| FR-5 Heatmaps | Analytics + map | Heatmap aggregation | `/hotspots` | Hotspot Heatmap |
| FR-6 Prediction | Prediction service | Prediction model | `/predictions` | Predictions & Recommendations |
| FR-7 LLM reports | LLM service | Prompt design | `/reports` | Reports, Violation Detail |
| FR-8 Dashboard | Presentation layer | — | `/dashboard`,`/search`,`/auth` | All |

Full traceability is re-checked during verification (see [05-implementation-plan.md](05-implementation-plan.md#verification--traceability)).
