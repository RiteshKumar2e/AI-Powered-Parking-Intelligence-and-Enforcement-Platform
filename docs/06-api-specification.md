# 06 · API Specification

← Prev: [05 Implementation Plan](05-implementation-plan.md) · Next: [07 Data & ML Models](07-data-and-ml-models.md)

REST + WebSocket contracts for the FastAPI backend. Resource names match the [LLD schema](03-LLD-low-level-design.md#2-database-schema); these endpoints back the [dashboard pages](04-page-structure-and-ui.md). This is the design-level contract; the generated OpenAPI spec is the runtime source of truth.

---

## 1. Conventions

- **Base path**: `/api/v1`.
- **Auth**: `Authorization: Bearer <JWT>` on all endpoints except `/auth/login`. RBAC per the [access matrix](04-page-structure-and-ui.md#role-based-access-matrix).
- **Content type**: `application/json` (except evidence binary / multipart upload).
- **Pagination**: list endpoints accept `?page=&page_size=` and return `{ items, page, page_size, total }`.
- **Filtering**: documented per endpoint; date filters are ISO-8601 (`from`, `to`).
- **Errors**: consistent envelope:
  ```json
  { "error": { "code": "string", "message": "human readable", "details": {} }, "request_id": "uuid" }
  ```
  Status codes: `400` validation, `401` unauth, `403` forbidden (RBAC), `404` not found, `409` conflict, `422` semantic, `429` rate limit, `500` server.
- **IDs**: UUIDs. **Timestamps**: UTC ISO-8601. **Geo**: GeoJSON for polygons/points.
- **Evidence URLs**: short-lived signed URLs, never raw object keys.

---

## 2. Resource Groups

| Group | Purpose | Backs |
| --- | --- | --- |
| `/auth` | login, refresh, logout, me | Login |
| `/cameras` | camera registry CRUD | Admin, Live |
| `/zones` | geofence CRUD (GeoJSON) | Admin (map editor) |
| `/detections` | raw detection query | Live, debugging |
| `/violations` | violations + actions | Violations, Detail |
| `/plates` | plate review/correction | Detail (needs_review) |
| `/evidence` | signed evidence URLs | Detail |
| `/congestion` | congestion time-series | Congestion Analytics |
| `/hotspots` | heatmap cells | Hotspot map |
| `/predictions` | forecasts + recommendations | Predictions |
| `/reports` | LLM reports CRUD + generate | Reports, Detail |
| `/dashboard` | KPI summaries | Overview |
| `/search` | cross-record search | Global Search |
| `/users`, `/settings` | user mgmt, config | Admin, Settings |
| `/ws` | WebSocket live channels | Live Monitoring |

---

## 3. Endpoint Reference

### 3.1 Auth
| Method | Path | Body / Query | Returns | Roles |
| --- | --- | --- | --- | --- |
| POST | `/auth/login` | `{email, password}` | `{access_token, refresh_token, user}` | public |
| POST | `/auth/refresh` | `{refresh_token}` | `{access_token}` | public |
| POST | `/auth/logout` | — | `204` | any |
| GET | `/auth/me` | — | current user + role | any |

### 3.2 Cameras
| Method | Path | Body / Query | Returns | Roles |
| --- | --- | --- | --- | --- |
| GET | `/cameras` | `?status=` | list | any |
| POST | `/cameras` | `{name, rtsp_url, location(GeoJSON Point), calibration}` | camera | admin |
| GET | `/cameras/{id}` | — | camera | any |
| PATCH | `/cameras/{id}` | partial | camera | admin |
| DELETE | `/cameras/{id}` | — | `204` | admin |

### 3.3 Zones
| Method | Path | Body / Query | Returns | Roles |
| --- | --- | --- | --- | --- |
| GET | `/zones` | `?zone_type=&active=` | list (GeoJSON) | any |
| POST | `/zones` | `{name, zone_type, geom(GeoJSON Polygon), dwell_threshold_s, active_window?}` | zone | admin |
| GET | `/zones/{id}` | — | zone | any |
| PATCH | `/zones/{id}` | partial | zone | admin |
| DELETE | `/zones/{id}` | — | `204` | admin |

### 3.4 Detections
| Method | Path | Query | Returns | Roles |
| --- | --- | --- | --- | --- |
| GET | `/detections` | `camera_id, from, to, vehicle_class, page, page_size` | paginated detections | any |

### 3.5 Violations
| Method | Path | Body / Query | Returns | Roles |
| --- | --- | --- | --- | --- |
| GET | `/violations` | `from,to,zone_id,zone_type,vehicle_class,status,plate,page,page_size` | paginated violations (+ evidence thumb URL, plate, zone, congestion_contribution, status) | view: any |
| GET | `/violations/{id}` | — | full violation (evidence, plate, zone, congestion impact, audit) | view: any |
| POST | `/violations/{id}/actions` | `{action: confirm\|dismiss\|ticket, notes?}` | updated violation + enforcement_action | officer/admin |
| GET | `/violations/export` | same filters | CSV stream | officer/analyst/admin |

### 3.6 Plates
| Method | Path | Body | Returns | Roles |
| --- | --- | --- | --- | --- |
| GET | `/plates?needs_review=true` | — | review queue | officer/admin |
| PATCH | `/plates/{id}` | `{plate_text, reviewed: true}` | plate (audit-logged) | officer/admin |

### 3.7 Evidence
| Method | Path | Returns | Roles |
| --- | --- | --- | --- |
| GET | `/evidence/{id}` | `{signed_url, kind, sha256, expires_at}` | view: any (role-gated, audit-logged) |

### 3.8 Congestion
| Method | Path | Query | Returns | Roles |
| --- | --- | --- | --- | --- |
| GET | `/congestion` | `camera_id\|segment_id, from, to, granularity(min\|hour\|day)` | time-series `{ts, congestion_score, occupancy_ratio, vehicle_count, flow_rate}` | any |

### 3.9 Hotspots
| Method | Path | Query | Returns | Roles |
| --- | --- | --- | --- | --- |
| GET | `/hotspots` | `from, to, zone_type, vehicle_class, severity, window, top?` | heat cells `{geo_cell(GeoJSON), intensity, violation_count, avg_congestion}` | any |

### 3.10 Predictions
| Method | Path | Query | Returns | Roles |
| --- | --- | --- | --- | --- |
| GET | `/predictions` | `horizon_start, horizon_end, zone_id?` | `{zone_id\|geo_cell, horizon, hotspot_probability, recommendation, model_version}` | analyst/officer/admin |

### 3.11 Reports
| Method | Path | Body / Query | Returns | Roles |
| --- | --- | --- | --- | --- |
| GET | `/reports` | `type, from, to, violation_id?, page, page_size` | paginated reports | view: any |
| GET | `/reports/{id}` | — | report (markdown + structured + source_refs) | view: any |
| POST | `/reports` | `{type: violation\|enforcement_summary\|decision_support, scope}` | generated report (sync for single; `202` + job for batch) | generate: officer/analyst/admin |
| GET | `/reports/{id}/export` | `?format=pdf\|csv` | file stream | view: any |

### 3.12 Dashboard
| Method | Path | Query | Returns | Roles |
| --- | --- | --- | --- | --- |
| GET | `/dashboard/summary` | `from, to` | `{violations_total, active_hotspots, live_congestion_index, actions_today, trend[]}` | any |

### 3.13 Search
| Method | Path | Query | Returns | Roles |
| --- | --- | --- | --- | --- |
| GET | `/search` | `q, type?(violation\|plate\|report), from, to, page, page_size` | unified paginated results | any |

### 3.14 Users & Settings
| Method | Path | Body | Returns | Roles |
| --- | --- | --- | --- | --- |
| GET/POST | `/users` | user mgmt | list / user | admin |
| PATCH/DELETE | `/users/{id}` | partial / — | user / `204` | admin |
| GET/PATCH | `/settings` | profile, notifications, thresholds, retention | settings | self (admin for system settings) |

---

## 4. WebSocket Channels

| Channel | Direction | Payload |
| --- | --- | --- |
| `/ws/live` | server→client | `{type: "detection"\|"violation"\|"congestion", camera_id, data, ts}` |
| `/ws/alerts` | server→client | `{type: "new_violation"\|"hotspot_alert", data, ts}` |

- Auth via token on the WS handshake; subscriptions can be scoped by `camera_id` / zone.
- Backed by Redis pub/sub fan-out from the Violation Engine and Congestion service (see [HLD §4](02-HLD-high-level-design.md#4-end-to-end-data-flow)).

---

## 5. Example Payloads

**Violation (GET `/violations/{id}`)**
```json
{
  "id": "uuid",
  "ts": "2026-06-16T05:12:00Z",
  "camera_id": "uuid",
  "zone": { "id": "uuid", "name": "MG Road", "zone_type": "no_parking" },
  "vehicle_class": "two_wheeler",
  "status": "pending",
  "congestion_contribution": 18,
  "severity": "high",
  "plate": { "text": "KA01AB1234", "confidence": 0.94, "needs_review": false },
  "evidence": [{ "id": "uuid", "kind": "image", "signed_url": "https://…", "sha256": "…" }],
  "audit": [{ "action": "created", "ts": "…" }]
}
```

**Generate report (POST `/reports`)**
```json
// request
{ "type": "violation", "scope": { "violation_id": "uuid" } }
// response
{
  "id": "uuid",
  "type": "violation",
  "model": "claude-opus-4-8",
  "content": "A two-wheeler was parked in a no-parking zone on MG Road for 6m20s…",
  "structured": { "summary": "…", "details": ["…"], "recommended_actions": ["…"] },
  "source_refs": ["violation:uuid", "congestion_metric:uuid"],
  "generated_at": "2026-06-16T05:20:00Z"
}
```
