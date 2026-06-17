"""
License plate OCR. Uses EasyOCR with Indian plate format validation.
Falls back to simulation when not available.
"""
import re
import random
import logging
from typing import Optional, List, Dict, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Indian plate format: MH 12 AB 1234
INDIAN_PLATE_PATTERN = re.compile(
    r'^([A-Z]{2})\s?(\d{1,2})\s?([A-Z]{1,3})\s?(\d{1,4})$'
)

INDIAN_STATE_CODES = [
    "MH", "DL", "KA", "TN", "GJ", "RJ", "UP", "MP", "WB", "AP",
    "TS", "KL", "HR", "PB", "BR", "OR", "AS", "JH", "UK", "HP",
]


class OCRResult:
    def __init__(self, raw_text: str, confidence: float, alternatives: List[str] = None):
        self.raw_text = raw_text.upper().strip()
        self.normalized = self._normalize(self.raw_text)
        self.confidence = confidence
        self.alternatives = alternatives or []
        self.is_valid = bool(INDIAN_PLATE_PATTERN.match(self.normalized))
        self.needs_review = confidence < 0.70 or not self.is_valid
        parts = INDIAN_PLATE_PATTERN.match(self.normalized)
        self.state_code = parts.group(1) if parts else None
        self.district_code = parts.group(2) if parts else None
        self.series = parts.group(3) if parts else None
        self.number = parts.group(4) if parts else None

    @staticmethod
    def _normalize(text: str) -> str:
        # Remove common OCR substitution errors
        text = text.upper().replace("0", "O").replace("I", "1")
        text = re.sub(r'[^A-Z0-9 ]', '', text)
        return text.strip()


class PlateOCR:
    def __init__(self, languages: str = "en", simulate: bool = True):
        self.simulate = simulate
        self.reader = None
        if not simulate:
            self._load_reader(languages)

    def _load_reader(self, languages: str):
        try:
            import easyocr
            lang_list = [l.strip() for l in languages.split(",")]
            self.reader = easyocr.Reader(lang_list, gpu=False)
            logger.info("EasyOCR reader initialized")
        except Exception as e:
            logger.warning(f"EasyOCR init failed ({e}), switching to simulation")
            self.simulate = True

    def read_plate(self, image: np.ndarray) -> Optional[OCRResult]:
        if self.simulate or self.reader is None:
            return self._simulate_ocr()
        return self._run_ocr(image)

    def _run_ocr(self, image: np.ndarray) -> Optional[OCRResult]:
        try:
            results = self.reader.readtext(image, detail=1, paragraph=False)
            if not results:
                return None
            best = max(results, key=lambda x: x[2])
            text, confidence = best[1], best[2]
            alternatives = [r[1] for r in results if r[1] != text][:3]
            return OCRResult(text, confidence, alternatives)
        except Exception as e:
            logger.error(f"OCR error: {e}")
            return None

    def _simulate_ocr(self) -> OCRResult:
        state = random.choice(INDIAN_STATE_CODES)
        district = str(random.randint(1, 99)).zfill(2)
        series = "".join(random.choices("ABCDEFGHJKLMNPRSTUVWXYZ", k=random.randint(1, 3)))
        number = str(random.randint(1, 9999)).zfill(4)
        plate_text = f"{state} {district} {series} {number}"
        confidence = round(random.uniform(0.72, 0.97), 3)
        if random.random() < 0.15:
            confidence = round(random.uniform(0.50, 0.72), 3)
        return OCRResult(plate_text, confidence)


_ocr: Optional[PlateOCR] = None


def get_ocr() -> PlateOCR:
    global _ocr
    if _ocr is None:
        from app.config import settings
        _ocr = PlateOCR(
            languages=settings.OCR_LANGUAGES,
            simulate=settings.SIMULATE_DETECTIONS,
        )
    return _ocr
