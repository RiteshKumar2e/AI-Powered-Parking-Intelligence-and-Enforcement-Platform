# 07 · Data & ML Models

← Prev: [06 API Spec](06-api-specification.md) · Back to [README](README.md)

Datasets, model selection per task, training/evaluation approach with target metrics, the model registry, and the **Claude LLM** usage details (model, parameters, prompting, cost) for the reporting module.

---

## 1. Datasets

| Task | Candidate public datasets | Local data plan |
| --- | --- | --- |
| Vehicle detection | COCO (vehicle classes), UA-DETRAC, India Driving Dataset (IDD) | Collect/label Bengaluru camera frames; include auto-rickshaws & two-wheelers (under-represented in COCO) |
| LPR / plate localization | OpenALPR benchmark, CCPD (adapt), Indian ANPR datasets | Label local plates across day/night/weather/angles |
| OCR (plate text) | Synthetic plate generators + real crops | Hard-negative mining from manual-review corrections |
| Congestion / occupancy | CityFlow, traffic-density datasets | Label road masks + ground-truth congestion ratings per segment |
| Prediction | n/a (built from our own history) | Accumulate violations + congestion over the pilot to train forecasts |

**Labeling**: bounding boxes (vehicle class), plate polygons + text, road-drivable masks, and congestion ratings. Manual-review plate corrections feed back as labeled data (active-learning loop).

**Class set** (vehicle_class): `car`, `two_wheeler`, `auto_rickshaw`, `truck`, `bus` (extendable). Indian-context classes (two-wheeler, auto) are explicitly included because they dominate local traffic and are weak in generic datasets.

---

## 2. Model Selection per Task

| Task | Model | Why | Serving |
| --- | --- | --- | --- |
| Vehicle detection | **YOLOv8 / v11** (size tuned for GPU budget) | Best real-time accuracy/speed; strong tooling | GPU worker, batched |
| Tracking | **ByteTrack** (DeepSORT fallback) | High MOT accuracy, lightweight, good for dwell | CPU/GPU |
| Plate localization | YOLO/det head or heuristic ROI | Reuse detection stack | GPU worker |
| Plate OCR | **PaddleOCR** (recognition) | Strong multilingual OCR; good on varied plates | GPU/CPU |
| Congestion scoring | Deterministic formula + (optional) learned occupancy from segmentation | Interpretable, tunable; segmentation only if needed | CPU/GPU |
| Prediction | **XGBoost/LightGBM** (tabular) and/or **LSTM/Temporal** or **Prophet** (sequence) | Choose by eval; gradient boosting is a strong, cheap baseline | batch train + serve |
| Reporting | **Claude `claude-opus-4-8`** | Reasoning, vision, structured output, batch, large context | Anthropic API |

---

## 3. Training & Evaluation

### 3.1 Targets (eval gates in CI — see [05 §3](05-implementation-plan.md#3-testing-strategy))

| Model | Metric | Target |
| --- | --- | --- |
| Vehicle detection | mAP@0.5 | ≥ 0.85 |
| Plate localization | IoU / recall | ≥ 0.90 recall |
| OCR | field-level (full plate) accuracy on clear plates | ≥ 0.90 |
| OCR | character-level accuracy | ≥ 0.95 |
| Congestion score | MAE vs human-rated ground truth | within tuned band (e.g. ≤ 8 on 0–100) |
| Prediction | precision/recall (hotspot vs not) & PR-AUC | beat seasonal-naive baseline by target margin |

### 3.2 Approach
- **Detection/OCR**: start from pretrained weights, fine-tune on local labeled data; augment for night/rain/blur/angle; multi-frame voting for plates to lift accuracy.
- **Congestion**: calibrate formula weights `w_d, w_o, w_l, w_f` (see [LLD §5](03-LLD-low-level-design.md#5-congestion-scoring-algorithm-fr-4)) against human-rated segments; optionally learn occupancy via road segmentation.
- **Prediction**: time-based train/validation split (no leakage); compare boosting vs sequence models; baseline = seasonal-naive (same hour/day last week).
- **Active learning**: manual-review plate corrections and dismissed/confirmed violations re-enter the training set.

### 3.3 Model registry & versioning
- Every trained artifact registered with a **version**, metrics, dataset hash, and config.
- Serving pins a version; rollback supported; outputs (`predictions.model_version`, `reports.model`) carry the version for audit.
- **Drift monitoring** (NFR-8): track live detection confidence, OCR accuracy on reviewed plates, and prediction error vs realized hotspots; trigger retraining when drift exceeds thresholds.

---

## 4. Claude LLM Usage (Reporting Module, FR-7)

> Verified against the current Claude API reference. Default model **`claude-opus-4-8`** (1M-token context window, 128K max output, **$5 / 1M input, $25 / 1M output**). Use the official **Anthropic Python SDK** (`anthropic`) from the `reporting` service.

### 4.1 Recommended request parameters

| Parameter | Value | Why |
| --- | --- | --- |
| `model` | `claude-opus-4-8` | Default; best reasoning + vision + structured output |
| `thinking` | `{ "type": "adaptive" }` | Adaptive thinking — Claude decides depth; no fixed token budget |
| `output_config.effort` | `medium` (reports) / `high` (decision-support) | Quality/cost balance; raise for analytical insight |
| `output_config.format` | JSON schema | **Structured output** → machine-parseable report fields |
| `max_tokens` | sized to report length (stream if large) | Avoid truncation |
| `cache_control` | `{ "type": "ephemeral" }` on the system prompt | **Prompt caching** — the stable system prompt is reused across many reports (~90% cheaper on the cached prefix) |

> **Important (model behavior):** on Opus 4.8, `budget_tokens` and sampling params (`temperature`/`top_p`/`top_k`) are **not** used — adaptive thinking + `effort` replace them. Assistant-message *prefill* is not supported; we steer output via the system prompt + structured-output schema instead.

### 4.2 Per-violation report (real-time, on confirm)

Single synchronous `messages.create()` (or `messages.parse()` with a schema). Illustrative shape:

```python
# reporting/claude_client.py  (illustrative)
import anthropic
client = anthropic.Anthropic()  # ANTHROPIC_API_KEY from env

SYSTEM = (
  "You are a traffic-enforcement reporting assistant. "
  "Use ONLY the provided structured data. Never invent plates, times, or locations. "
  "Cite every fact via source_refs. Be concise and factual."
)

resp = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=1500,
    thinking={"type": "adaptive"},
    output_config={
        "effort": "medium",
        "format": {  # structured output schema
            "type": "json_schema",
            "schema": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string"},
                    "details": {"type": "array", "items": {"type": "string"}},
                    "recommended_actions": {"type": "array", "items": {"type": "string"}},
                    "source_refs": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["summary", "details", "source_refs"],
                "additionalProperties": False,
            },
        },
    },
    system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
    messages=[{"role": "user", "content": VIOLATION_JSON_BLOCK}],
)
```

- **Optional vision QA**: include the annotated evidence image as an `image` content block so Claude can sanity-check that the report matches what's visible (e.g. confirm a vehicle is clearly within the marked zone) — useful for borderline cases.

### 4.3 Nightly enforcement summaries (Batch API)

Daily/weekly summaries and bulk decision-support are **not latency-sensitive**, so they run via the **Message Batches API** at **50% cost**:

- Build one request per scope (per ward/zone/day) with the same system prompt + structured aggregates.
- Submit as a batch; poll for completion (most finish within ~1h, max 24h); store results in `reports`.
- This is the primary LLM cost lever (NFR-9) alongside prompt caching.

### 4.4 Grounding, guardrails & cost (FR-7.4, NFR-6/9)

- **Grounding**: every report's `source_refs` must reference the violation/metric IDs passed in; a golden-set test asserts no fabricated plates/times ([05 §3](05-implementation-plan.md#3-testing-strategy)).
- **PII boundary**: send only the structured fields a report needs; redact on export per role.
- **Cost controls**: prompt caching on the system prompt, Batch API for bulk, `effort` tuning, and generating reports **on confirmation** (not per detection). Token usage is recorded on each `reports` row for budget tracking.
- **Resilience**: API errors retried with backoff (SDK default); persistent failures queue for retry without affecting violation data.
- **RAG (optional, decision-support)**: retrieve prior reports/notes from the vector store (embeddings keyed by zone/time) to give Claude historical context for recurring-hotspot narratives.

### 4.5 Model accuracy note
Model IDs, context window, max output, and pricing above were confirmed against the current Claude API reference (`claude-opus-4-8`: 1M context, 128K output, $5/$25 per 1M tokens). If Anthropic publishes newer models, re-check the Models API / pricing before changing the default — `claude-opus-4-8` is the recommended default for this workload at design time.

---

## 5. Data Lifecycle & Retention (ties to NFR-6)

| Data | Retention | Notes |
| --- | --- | --- |
| Raw frames | short (hours) | discarded after processing unless flagged |
| Detections | medium | retention-limited; aggregates kept |
| Evidence (violations) | per legal policy | immutable; purged on policy expiry |
| Plate PII | per policy | encrypted; access audited; purged with evidence |
| Congestion time-series | long (downsampled) | continuous aggregates retained for trends |
| Reports | long | audit/decision record |

Automated purge jobs enforce retention windows; all access to PII/evidence is audit-logged.
