"""
Non-parking traffic violation detection.

Detects violations beyond illegal parking using a combination of:
  - Spatial reasoning (bounding-box overlaps, region analysis)
  - Heuristic rules (person count on vehicle, direction of travel)
  - Confidence-scored classification

Supported violations:
  - Helmet non-compliance (motorcycle rider without helmet)
  - Triple riding (≥3 persons on a motorcycle)
  - Seatbelt non-compliance (driver region analysis)
  - Wrong-side driving (direction-of-travel vs lane map)
  - Stop-line violation (vehicle crossing stop-line ROI)
  - Red-light violation (vehicle crossing on red signal state)

Each detector returns a ViolationCandidate with type, confidence, and metadata.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime

import numpy as np

logger = logging.getLogger(__name__)

try:
    import cv2
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False


@dataclass
class ViolationCandidate:
    """A detected non-parking violation with confidence and evidence metadata."""
    violation_type: str          # matches ViolationType enum values
    confidence: float            # 0.0 - 1.0
    vehicle_track_id: str        # which vehicle track this applies to
    vehicle_class: str
    bbox: Dict                   # vehicle bounding box
    metadata: Dict = field(default_factory=dict)  # extra info (person_count, etc.)
    detected_at: datetime = field(default_factory=datetime.utcnow)


# ── helper geometry ──────────────────────────────────────────────────────────

def _bbox_area(b: Dict) -> float:
    return b["w"] * b["h"]


def _bbox_overlap_ratio(inner: Dict, outer: Dict) -> float:
    """How much of `inner` overlaps with `outer` (0-1)."""
    x1 = max(inner["x"], outer["x"])
    y1 = max(inner["y"], outer["y"])
    x2 = min(inner["x"] + inner["w"], outer["x"] + outer["w"])
    y2 = min(inner["y"] + inner["h"], outer["y"] + outer["h"])
    if x2 <= x1 or y2 <= y1:
        return 0.0
    inter = (x2 - x1) * (y2 - y1)
    inner_area = _bbox_area(inner)
    return inter / inner_area if inner_area > 0 else 0.0


def _bbox_center(b: Dict) -> Tuple[float, float]:
    return b["x"] + b["w"] / 2.0, b["y"] + b["h"] / 2.0


def _is_above(person_bbox: Dict, vehicle_bbox: Dict) -> bool:
    """Check if person's center-y is in the upper half of the vehicle bbox."""
    _, py = _bbox_center(person_bbox)
    vy = vehicle_bbox["y"]
    vh_half = vehicle_bbox["h"] / 2.0
    return py < vy + vh_half


# ── individual violation detectors ───────────────────────────────────────────

def detect_helmet_violation(
    vehicle_detections: List[Dict],
    person_detections: List[Dict],
    frame: Optional[np.ndarray] = None,
) -> List[ViolationCandidate]:
    """
    Detect helmet non-compliance on motorcycles.

    Logic:
      1. Find persons overlapping with motorcycle bounding boxes.
      2. For each person on a motorcycle, check the head region
         (top 30% of person bbox) for helmet-like features.
      3. If no helmet detected → violation.

    Without a fine-tuned helmet classifier, we use a colour-density heuristic
    on the head region: helmets tend to be a single solid-colour blob.
    """
    violations = []

    motorcycles = [d for d in vehicle_detections if d.get("vehicle_class") == "motorcycle"]

    for moto in motorcycles:
        moto_bbox = moto["bbox"]
        riders = []

        for person in person_detections:
            overlap = _bbox_overlap_ratio(person["bbox"], moto_bbox)
            if overlap > 0.3:
                riders.append(person)

        for rider in riders:
            p_bbox = rider["bbox"]
            # Head region: top 30% of person bounding box
            head_bbox = {
                "x": p_bbox["x"],
                "y": p_bbox["y"],
                "w": p_bbox["w"],
                "h": int(p_bbox["h"] * 0.30),
            }

            has_helmet = False
            confidence = 0.55  # base confidence for heuristic detection

            if frame is not None and _CV2_AVAILABLE:
                try:
                    hx, hy = head_bbox["x"], head_bbox["y"]
                    hw, hh = head_bbox["w"], head_bbox["h"]
                    # Clamp to frame bounds
                    hy2 = min(hy + hh, frame.shape[0])
                    hx2 = min(hx + hw, frame.shape[1])
                    hx, hy = max(0, hx), max(0, hy)

                    head_crop = frame[hy:hy2, hx:hx2]
                    if head_crop.size > 0:
                        # Heuristic: helmets are typically solid-coloured (low std-dev)
                        # and darker than skin (lower mean brightness)
                        hsv = cv2.cvtColor(head_crop, cv2.COLOR_RGB2HSV)
                        sat_std = float(np.std(hsv[:, :, 1]))
                        val_mean = float(np.mean(hsv[:, :, 2]))

                        # Helmet indicators: solid colour blob (low saturation variance),
                        # darker than typical skin
                        if sat_std < 25 and val_mean < 140:
                            has_helmet = True
                            confidence = 0.60
                        else:
                            confidence = 0.65 + min(sat_std / 100.0, 0.20)
                except Exception as e:
                    logger.debug("Helmet crop analysis failed: %s", e)

            if not has_helmet:
                violations.append(ViolationCandidate(
                    violation_type="helmet_non_compliance",
                    confidence=round(confidence, 3),
                    vehicle_track_id=moto.get("track_id", "unknown"),
                    vehicle_class="motorcycle",
                    bbox=moto_bbox,
                    metadata={
                        "rider_bbox": p_bbox,
                        "head_region": head_bbox,
                        "detection_method": "head_region_heuristic",
                    },
                ))

    return violations


def detect_triple_riding(
    vehicle_detections: List[Dict],
    person_detections: List[Dict],
) -> List[ViolationCandidate]:
    """
    Detect triple riding (≥3 persons on a single motorcycle).

    Logic: Count persons whose bounding boxes overlap ≥30% with motorcycle bbox.
    """
    violations = []

    motorcycles = [d for d in vehicle_detections if d.get("vehicle_class") == "motorcycle"]

    for moto in motorcycles:
        moto_bbox = moto["bbox"]
        rider_count = 0

        for person in person_detections:
            overlap = _bbox_overlap_ratio(person["bbox"], moto_bbox)
            if overlap > 0.25:
                rider_count += 1

        if rider_count >= 3:
            # Confidence scales with person count
            conf = min(0.60 + (rider_count - 3) * 0.10, 0.95)
            violations.append(ViolationCandidate(
                violation_type="triple_riding",
                confidence=round(conf, 3),
                vehicle_track_id=moto.get("track_id", "unknown"),
                vehicle_class="motorcycle",
                bbox=moto_bbox,
                metadata={
                    "person_count": rider_count,
                    "detection_method": "person_overlap_count",
                },
            ))

    return violations


def detect_seatbelt_violation(
    vehicle_detections: List[Dict],
    person_detections: List[Dict],
    frame: Optional[np.ndarray] = None,
) -> List[ViolationCandidate]:
    """
    Detect seatbelt non-compliance in cars.

    Logic: Analyse the driver region (front-left seat area) of car bounding boxes.
    Look for diagonal line patterns typical of seatbelts using edge detection.
    """
    violations = []

    if frame is None or not _CV2_AVAILABLE:
        return violations  # Need image data for seatbelt analysis

    cars = [d for d in vehicle_detections if d.get("vehicle_class") in ("car",)]

    for car in cars:
        car_bbox = car["bbox"]
        # Driver region: left 40%, middle 60% vertically
        driver_region = {
            "x": car_bbox["x"],
            "y": car_bbox["y"] + int(car_bbox["h"] * 0.20),
            "w": int(car_bbox["w"] * 0.40),
            "h": int(car_bbox["h"] * 0.60),
        }

        try:
            dx, dy = driver_region["x"], driver_region["y"]
            dw, dh = driver_region["w"], driver_region["h"]
            dy2 = min(dy + dh, frame.shape[0])
            dx2 = min(dx + dw, frame.shape[1])
            dx, dy = max(0, dx), max(0, dy)

            crop = frame[dy:dy2, dx:dx2]
            if crop.size == 0:
                continue

            gray = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
            edges = cv2.Canny(gray, 50, 150)

            # Hough lines to detect diagonal seatbelt strap
            lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 30,
                                    minLineLength=20, maxLineGap=10)

            has_diagonal = False
            if lines is not None:
                for line in lines:
                    x1, y1, x2, y2 = line[0]
                    if abs(x2 - x1) < 1:
                        continue
                    angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
                    # Seatbelt strap is typically 20-70 degrees
                    if 20 <= angle <= 70:
                        has_diagonal = True
                        break

            if not has_diagonal:
                violations.append(ViolationCandidate(
                    violation_type="seatbelt_non_compliance",
                    confidence=0.50,  # Lower confidence — heuristic-based
                    vehicle_track_id=car.get("track_id", "unknown"),
                    vehicle_class="car",
                    bbox=car_bbox,
                    metadata={
                        "driver_region": driver_region,
                        "edge_count": int(np.sum(edges > 0)),
                        "detection_method": "diagonal_line_heuristic",
                    },
                ))
        except Exception as e:
            logger.debug("Seatbelt analysis failed: %s", e)

    return violations


def detect_wrong_side_driving(
    vehicle_detections: List[Dict],
    tracker_history: Optional[Dict] = None,
    lane_direction: str = "left_to_right",
) -> List[ViolationCandidate]:
    """
    Detect wrong-side driving using direction of travel vs expected lane direction.

    Logic: Compare consecutive positions of tracked vehicles to determine
    direction of travel. If opposite to expected lane direction → violation.

    Args:
        tracker_history: dict mapping track_id → list of (x, y) center positions
        lane_direction: expected direction ("left_to_right" or "right_to_left")
    """
    violations = []

    if not tracker_history:
        return violations

    for det in vehicle_detections:
        track_id = det.get("track_id", "")
        positions = tracker_history.get(track_id, [])

        if len(positions) < 3:
            continue

        # Calculate average horizontal movement direction
        dx_total = 0.0
        for i in range(1, len(positions)):
            dx_total += positions[i][0] - positions[i - 1][0]

        avg_dx = dx_total / (len(positions) - 1)

        # Determine if travelling in wrong direction
        is_wrong = False
        if lane_direction == "left_to_right" and avg_dx < -5.0:
            is_wrong = True
        elif lane_direction == "right_to_left" and avg_dx > 5.0:
            is_wrong = True

        if is_wrong:
            violations.append(ViolationCandidate(
                violation_type="wrong_side_driving",
                confidence=round(min(0.55 + abs(avg_dx) / 50.0, 0.90), 3),
                vehicle_track_id=track_id,
                vehicle_class=det.get("vehicle_class", "unknown"),
                bbox=det["bbox"],
                metadata={
                    "avg_horizontal_displacement": round(avg_dx, 2),
                    "expected_direction": lane_direction,
                    "positions_tracked": len(positions),
                    "detection_method": "trajectory_direction",
                },
            ))

    return violations


def detect_stop_line_violation(
    vehicle_detections: List[Dict],
    stop_line_y: Optional[int] = None,
    tracker_history: Optional[Dict] = None,
) -> List[ViolationCandidate]:
    """
    Detect stop-line violation: vehicle crosses the stop-line ROI.

    Args:
        stop_line_y: Y-coordinate of the stop line in the camera frame.
        tracker_history: dict mapping track_id → list of (x, y) center positions.
    """
    violations = []

    if stop_line_y is None or not tracker_history:
        return violations

    for det in vehicle_detections:
        track_id = det.get("track_id", "")
        positions = tracker_history.get(track_id, [])

        if len(positions) < 2:
            continue

        # Check if vehicle crossed the stop line (moved past stop_line_y)
        prev_y = positions[-2][1]
        curr_y = positions[-1][1]

        crossed = (prev_y <= stop_line_y < curr_y) or (prev_y >= stop_line_y > curr_y)

        if crossed:
            violations.append(ViolationCandidate(
                violation_type="stop_line_violation",
                confidence=0.75,
                vehicle_track_id=track_id,
                vehicle_class=det.get("vehicle_class", "unknown"),
                bbox=det["bbox"],
                metadata={
                    "stop_line_y": stop_line_y,
                    "prev_y": round(prev_y, 1),
                    "curr_y": round(curr_y, 1),
                    "detection_method": "line_crossing",
                },
            ))

    return violations


def detect_red_light_violation(
    vehicle_detections: List[Dict],
    signal_state: Optional[str] = None,
    stop_line_y: Optional[int] = None,
    tracker_history: Optional[Dict] = None,
) -> List[ViolationCandidate]:
    """
    Detect red-light violation: vehicle crosses stop line while signal is red.

    This combines stop-line crossing with traffic signal state.

    Args:
        signal_state: "red", "yellow", "green", or None
        stop_line_y: Y-coordinate of the stop line
        tracker_history: dict mapping track_id → list of (x, y) positions
    """
    violations = []

    if signal_state not in ("red",) or stop_line_y is None:
        return violations

    # Use stop-line crossing detection, then upgrade to red-light violation
    crossings = detect_stop_line_violation(vehicle_detections, stop_line_y, tracker_history)

    for crossing in crossings:
        violations.append(ViolationCandidate(
            violation_type="red_light_violation",
            confidence=round(crossing.confidence + 0.05, 3),  # higher confidence when signal confirmed
            vehicle_track_id=crossing.vehicle_track_id,
            vehicle_class=crossing.vehicle_class,
            bbox=crossing.bbox,
            metadata={
                **crossing.metadata,
                "signal_state": signal_state,
                "detection_method": "line_crossing_with_signal",
            },
        ))

    return violations


# ── unified classifier ───────────────────────────────────────────────────────

def classify_violations(
    vehicle_detections: List[Dict],
    person_detections: List[Dict],
    frame: Optional[np.ndarray] = None,
    tracker_history: Optional[Dict] = None,
    zone_config: Optional[Dict] = None,
) -> List[ViolationCandidate]:
    """
    Run all non-parking violation detectors and return a combined list.

    Args:
        vehicle_detections: list of dicts with keys:
            track_id, vehicle_class, bbox, confidence
        person_detections: list of dicts with keys:
            track_id, bbox, confidence (COCO class 0)
        frame: RGB numpy array of the current frame (optional, enables visual analysis)
        tracker_history: dict of track_id → [(x,y), ...] position history
        zone_config: optional zone settings:
            lane_direction: "left_to_right" | "right_to_left"
            stop_line_y: int pixel coordinate
            signal_state: "red" | "yellow" | "green" | None
    """
    zone_config = zone_config or {}
    all_violations: List[ViolationCandidate] = []

    # 1. Helmet non-compliance
    try:
        all_violations.extend(
            detect_helmet_violation(vehicle_detections, person_detections, frame)
        )
    except Exception as e:
        logger.error("Helmet detection failed: %s", e)

    # 2. Triple riding
    try:
        all_violations.extend(
            detect_triple_riding(vehicle_detections, person_detections)
        )
    except Exception as e:
        logger.error("Triple riding detection failed: %s", e)

    # 3. Seatbelt non-compliance
    try:
        all_violations.extend(
            detect_seatbelt_violation(vehicle_detections, person_detections, frame)
        )
    except Exception as e:
        logger.error("Seatbelt detection failed: %s", e)

    # 4. Wrong-side driving
    try:
        all_violations.extend(
            detect_wrong_side_driving(
                vehicle_detections,
                tracker_history,
                lane_direction=zone_config.get("lane_direction", "left_to_right"),
            )
        )
    except Exception as e:
        logger.error("Wrong-side detection failed: %s", e)

    # 5. Stop-line violation
    try:
        all_violations.extend(
            detect_stop_line_violation(
                vehicle_detections,
                stop_line_y=zone_config.get("stop_line_y"),
                tracker_history=tracker_history,
            )
        )
    except Exception as e:
        logger.error("Stop-line detection failed: %s", e)

    # 6. Red-light violation
    try:
        all_violations.extend(
            detect_red_light_violation(
                vehicle_detections,
                signal_state=zone_config.get("signal_state"),
                stop_line_y=zone_config.get("stop_line_y"),
                tracker_history=tracker_history,
            )
        )
    except Exception as e:
        logger.error("Red-light detection failed: %s", e)

    logger.debug(
        "Violation classifier found %d non-parking violations: %s",
        len(all_violations),
        ", ".join(v.violation_type for v in all_violations) or "none",
    )
    return all_violations
