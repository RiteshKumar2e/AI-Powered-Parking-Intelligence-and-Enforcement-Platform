"""
Simple IoU-based vehicle tracker for dwell time measurement.
Replaces ByteTrack for portability; upgrade to ByteTrack for production.
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)

IOU_THRESHOLD = 0.3
MAX_MISSING_FRAMES = 30
PARKED_DWELL_THRESHOLD = 120  # seconds considered parked


@dataclass
class Track:
    track_id: str
    vehicle_class: str
    bbox: Dict
    first_seen: datetime = field(default_factory=datetime.utcnow)
    last_seen: datetime = field(default_factory=datetime.utcnow)
    missing_frames: int = 0
    frame_count: int = 1
    is_active: bool = True

    @property
    def dwell_seconds(self) -> int:
        return int((self.last_seen - self.first_seen).total_seconds())

    @property
    def is_parked(self) -> bool:
        return self.dwell_seconds >= PARKED_DWELL_THRESHOLD


def _iou(b1: Dict, b2: Dict) -> float:
    x1, y1, w1, h1 = b1["x"], b1["y"], b1["w"], b1["h"]
    x2, y2, w2, h2 = b2["x"], b2["y"], b2["w"], b2["h"]
    ix = max(0, min(x1 + w1, x2 + w2) - max(x1, x2))
    iy = max(0, min(y1 + h1, y2 + h2) - max(y1, y2))
    intersection = ix * iy
    union = w1 * h1 + w2 * h2 - intersection
    return intersection / union if union > 0 else 0.0


class VehicleTracker:
    def __init__(self):
        self._tracks: Dict[str, Track] = {}
        self._counter = 0
        self._lost: List[Track] = []  # recently expired tracks

    def _new_id(self) -> str:
        self._counter += 1
        return f"trk_{self._counter:06d}"

    def update(self, detections: List[Dict]) -> List[Track]:
        """
        detections: list of {"vehicle_class": str, "bbox": dict, "confidence": float}
        Returns active tracks after matching.
        """
        now = datetime.utcnow()
        active = [t for t in self._tracks.values() if t.is_active]

        matched_det = set()
        matched_trk = set()

        # Greedy IoU matching
        for track in active:
            best_iou, best_idx = 0.0, -1
            for i, det in enumerate(detections):
                if i in matched_det:
                    continue
                score = _iou(track.bbox, det["bbox"])
                if score > best_iou:
                    best_iou, best_idx = score, i
            if best_iou >= IOU_THRESHOLD and best_idx >= 0:
                track.bbox = detections[best_idx]["bbox"]
                track.last_seen = now
                track.missing_frames = 0
                track.frame_count += 1
                matched_det.add(best_idx)
                matched_trk.add(track.track_id)

        # Age unmatched tracks
        for track in active:
            if track.track_id not in matched_trk:
                track.missing_frames += 1
                if track.missing_frames > MAX_MISSING_FRAMES:
                    track.is_active = False
                    self._lost.append(track)

        # Create new tracks for unmatched detections
        for i, det in enumerate(detections):
            if i not in matched_det:
                tid = self._new_id()
                self._tracks[tid] = Track(
                    track_id=tid,
                    vehicle_class=det.get("vehicle_class", "car"),
                    bbox=det["bbox"],
                )

        return [t for t in self._tracks.values() if t.is_active]

    def get_parked_tracks(self) -> List[Track]:
        return [t for t in self._tracks.values() if t.is_active and t.is_parked]

    def reset(self):
        self._tracks.clear()
        self._lost.clear()
