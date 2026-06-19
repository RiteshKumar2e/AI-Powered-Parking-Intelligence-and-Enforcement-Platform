from app.ml.detector import get_detector, VehicleDetector, DetectionResult, PersonDetectionResult
from app.ml.ocr import get_ocr, PlateOCR, OCRResult
from app.ml.tracker import VehicleTracker, Track
from app.ml.preprocessor import preprocess_frame, assess_quality, PreprocessConfig
from app.ml.violation_classifier import classify_violations, ViolationCandidate
