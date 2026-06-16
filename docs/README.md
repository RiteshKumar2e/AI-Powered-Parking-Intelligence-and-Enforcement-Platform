# AI-Powered Parking Intelligence & Enforcement Platform

> Planning & design documentation package. **No application code yet** — this folder defines *what* will be built and *how*.

## 1. Vision

Urban centres like **Bengaluru** lose enormous time and fuel to congestion, a large share of which is caused by **illegal/on-street parking** near intersections, metro stations, commercial hubs, and event venues. Today enforcement is **manual**: officers physically patrol, spot violations, and write tickets — slow, inconsistent, non-scalable, and reactive.

This platform automates the loop end-to-end:

> **Detect → Recognize → Analyze → Predict → Report → Visualize**

It ingests traffic-camera images and video, detects illegally parked vehicles using computer vision, reads their number plates via OCR, quantifies the congestion they cause, predicts where the next hotspots will form, auto-writes human-readable enforcement reports with an LLM, and presents everything on an interactive dashboard for traffic authorities.

## 2. Problem Statement

| Today (manual) | With this platform |
| --- | --- |
| Officers patrol to find violations | Cameras + AI detect 24×7 automatically |
| Plate noted by hand, error-prone | OCR/ANPR extracts registration with confidence scoring |
| No quantified congestion impact | Real-time congestion score (0–100) per location |
| Enforcement is reactive | Predictive hotspot forecasting + recommended actions |
| Reports written manually | LLM auto-generates violation reports & enforcement summaries |
| No central view | Interactive dashboard: stats, trends, heatmaps, search |

## 3. Capabilities at a Glance

1. **Illegal-parking detection** — vehicles in no-parking zones, near intersections, metro stations, commercial hubs, event areas.
2. **License Plate Recognition (LPR/ANPR)** — OCR-based registration extraction (Indian plate formats).
3. **Annotated visual evidence** — bounding boxes + timestamp + geolocation overlay, stored as tamper-evident evidence.
4. **Traffic density & road-occupancy analytics** — real-time **congestion score (0–100)**.
5. **Dynamic hotspot heatmaps** — geospatial heat layers over time.
6. **Predictive analytics** — forecast future congestion hotspots; recommend targeted enforcement.
7. **LLM reporting (Claude)** — violation reports, enforcement summaries, decision-support insights.
8. **Interactive dashboard** — violation stats, congestion trends, hotspot analysis, searchable records, recommendations.

## 4. Technology Stack (summary)

| Layer | Choice | Why |
| --- | --- | --- |
| Backend API | **Python · FastAPI** | Async, native to the ML ecosystem, OpenAPI built-in |
| Object detection | **YOLO (v8/v11)** | SOTA real-time vehicle detection |
| Object tracking | **ByteTrack / DeepSORT** | Dwell-time → parked-vs-moving |
| LPR / OCR | **PaddleOCR** (+ plate-localization model) | Strong multilingual OCR, good on Indian plates |
| LLM reporting | **Claude `claude-opus-4-8`** (Anthropic) | Best-in-class reasoning; vision for image QA; 1M context; Batch API for cheap nightly report runs |
| Streaming / queue | **Kafka** (or Redis Streams) | Decouple ingest from inference; back-pressure |
| Relational + geo DB | **PostgreSQL + PostGIS** | Zones, violations, spatial queries |
| Time-series | **TimescaleDB** | Congestion metrics over time |
| Evidence storage | **S3 / MinIO** | Image/video blobs |
| Cache / realtime | **Redis** | Hot state, pub/sub for live dashboard |
| Frontend | **React + TypeScript** | Dashboard SPA |
| Maps / heatmaps | **Mapbox GL / Leaflet** | Interactive geo visualisation |
| Charts | **Recharts / D3** | Trends & analytics |
| Infra | **Docker + Kubernetes**, Prometheus + Grafana | Scalable, observable, HA |

> **Note on the LLM:** the reporting module uses Anthropic's Claude. Default model `claude-opus-4-8` (1M-token context, 128K max output, $5/$25 per 1M tokens). We use **adaptive thinking** + the **effort** parameter for quality/cost control, **vision** to let Claude sanity-check annotated evidence, **structured outputs** to get machine-parseable report fields, and the **Batch API** (50% cheaper) for non-real-time nightly summary generation. See [07-data-and-ml-models.md](07-data-and-ml-models.md).

## 5. Document Index

| # | Document | Contents |
| --- | --- | --- |
| — | [README.md](README.md) | This overview + glossary |
| 01 | [01-requirements-and-scope.md](01-requirements-and-scope.md) | Functional + non-functional requirements, personas, scope |
| 02 | [02-HLD-high-level-design.md](02-HLD-high-level-design.md) | **HLD** — system architecture, components, data flow, infra |
| 03 | [03-LLD-low-level-design.md](03-LLD-low-level-design.md) | **LLD** — modules, DB schema, algorithms, LLM prompt design |
| 04 | [04-page-structure-and-ui.md](04-page-structure-and-ui.md) | Dashboard IA, page-by-page UI, roles, wireframes |
| 05 | [05-implementation-plan.md](05-implementation-plan.md) | Phased roadmap, repo layout, testing, CI/CD, risks |
| 06 | [06-api-specification.md](06-api-specification.md) | REST + WebSocket endpoint contracts |
| 07 | [07-data-and-ml-models.md](07-data-and-ml-models.md) | Datasets, models, training, eval metrics, Claude prompts |

All architecture/ER/sequence diagrams are written as **Mermaid** code blocks (render natively on GitHub). Mermaid sources are mirrored under [diagrams/](diagrams/).

## 6. Glossary

| Term | Meaning |
| --- | --- |
| **LPR / ANPR** | License Plate Recognition / Automatic Number Plate Recognition |
| **OCR** | Optical Character Recognition (reading text from images) |
| **Geofence / Zone** | A polygon on the map marking a no-parking / restricted area |
| **Dwell time** | How long a tracked vehicle has stayed stationary |
| **Congestion score** | Normalised 0–100 index of how blocked a road segment is |
| **Hotspot** | A geographic area with high violation/congestion concentration |
| **Heatmap** | Color-intensity map layer showing hotspot density |
| **Evidence** | Annotated image/clip + metadata proving a violation |
| **YOLO** | "You Only Look Once" — real-time object-detection model family |
| **Hypertable** | TimescaleDB's auto-partitioned time-series table |
| **RBAC** | Role-Based Access Control |
