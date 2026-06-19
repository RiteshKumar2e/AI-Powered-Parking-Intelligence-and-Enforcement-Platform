"""
Image preprocessing pipeline for traffic surveillance images.

Handles real-world challenges:
  - Low light / nighttime → CLAHE + gamma correction
  - Rain / noise → bilateral denoising
  - Shadows → adaptive shadow removal
  - Motion blur → unsharp masking
  - General quality → auto brightness/contrast normalization

Each stage is optional and controlled by the PreprocessConfig dataclass.
"""
import logging
from dataclasses import dataclass, field
from typing import Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

try:
    import cv2
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False
    logger.warning("OpenCV not installed — image preprocessing disabled. pip install opencv-python-headless")


@dataclass
class PreprocessConfig:
    """Knobs for the preprocessing pipeline."""
    enable_clahe: bool = True           # Adaptive histogram equalisation
    clahe_clip_limit: float = 3.0       # CLAHE clip limit (higher = more contrast)
    clahe_tile_grid: Tuple[int, int] = (8, 8)

    enable_gamma: bool = True           # Auto gamma correction
    gamma_target_mean: float = 120.0    # Target mean brightness (0-255)

    enable_denoise: bool = True         # Bilateral denoising
    denoise_d: int = 7                  # Pixel neighbourhood diameter
    denoise_sigma_color: float = 50.0
    denoise_sigma_space: float = 50.0

    enable_sharpen: bool = True         # Unsharp mask for mild blur
    sharpen_kernel_size: int = 3
    sharpen_strength: float = 0.5       # 0 = none, 1 = aggressive

    enable_shadow_removal: bool = True  # Adaptive shadow attenuation
    shadow_blur_ksize: int = 21         # Must be odd

    auto_skip_if_good: bool = True      # Skip enhancement if image is already good quality
    brightness_ok_range: Tuple[float, float] = (80.0, 180.0)
    contrast_ok_min: float = 40.0       # Minimum std-dev of luminance


# ── singleton config ─────────────────────────────────────────────────────────
_config = PreprocessConfig()


def set_preprocess_config(cfg: PreprocessConfig):
    global _config
    _config = cfg


def get_preprocess_config() -> PreprocessConfig:
    return _config


# ── quality assessment ───────────────────────────────────────────────────────

def assess_quality(frame: np.ndarray) -> dict:
    """
    Return image quality metrics used to decide which enhancements to apply.
    """
    if not _CV2_AVAILABLE:
        return {"available": False}

    gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY) if len(frame.shape) == 3 else frame
    mean_brightness = float(np.mean(gray))
    std_brightness = float(np.std(gray))
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())  # sharpness

    return {
        "available": True,
        "mean_brightness": round(mean_brightness, 2),
        "std_brightness": round(std_brightness, 2),
        "laplacian_variance": round(laplacian_var, 2),      # low = blurry
        "is_low_light": mean_brightness < 80,
        "is_overexposed": mean_brightness > 200,
        "is_low_contrast": std_brightness < 40,
        "is_blurry": laplacian_var < 100,
    }


# ── individual stages ────────────────────────────────────────────────────────

def _apply_clahe(frame: np.ndarray, cfg: PreprocessConfig) -> np.ndarray:
    """Apply CLAHE on the L-channel of LAB colour space."""
    lab = cv2.cvtColor(frame, cv2.COLOR_RGB2LAB)
    l_channel, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(
        clipLimit=cfg.clahe_clip_limit,
        tileGridSize=cfg.clahe_tile_grid,
    )
    l_channel = clahe.apply(l_channel)
    return cv2.cvtColor(cv2.merge([l_channel, a, b]), cv2.COLOR_LAB2RGB)


def _apply_gamma(frame: np.ndarray, cfg: PreprocessConfig) -> np.ndarray:
    """Auto-gamma: shift mean brightness toward target."""
    gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
    current_mean = np.mean(gray)
    if current_mean < 1:
        return frame

    # gamma < 1 brightens, gamma > 1 darkens
    gamma = np.log(cfg.gamma_target_mean / 255.0) / np.log(current_mean / 255.0)
    gamma = np.clip(gamma, 0.3, 3.0)  # safety bounds

    table = (np.arange(256) / 255.0) ** gamma * 255.0
    table = np.clip(table, 0, 255).astype(np.uint8)
    return cv2.LUT(frame, table)


def _apply_denoise(frame: np.ndarray, cfg: PreprocessConfig) -> np.ndarray:
    """Bilateral filter: smooths noise while preserving edges."""
    return cv2.bilateralFilter(
        frame,
        d=cfg.denoise_d,
        sigmaColor=cfg.denoise_sigma_color,
        sigmaSpace=cfg.denoise_sigma_space,
    )


def _apply_sharpen(frame: np.ndarray, cfg: PreprocessConfig) -> np.ndarray:
    """Unsharp mask: sharpen mildly blurred surveillance frames."""
    blurred = cv2.GaussianBlur(frame, (cfg.sharpen_kernel_size, cfg.sharpen_kernel_size), 0)
    strength = cfg.sharpen_strength
    sharpened = cv2.addWeighted(frame, 1.0 + strength, blurred, -strength, 0)
    return np.clip(sharpened, 0, 255).astype(np.uint8)


def _apply_shadow_removal(frame: np.ndarray, cfg: PreprocessConfig) -> np.ndarray:
    """
    Reduce shadow intensity by dividing by a heavily blurred version of itself
    (morphological shadow removal approximation).
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
    bg = cv2.GaussianBlur(gray, (cfg.shadow_blur_ksize, cfg.shadow_blur_ksize), 0)

    # Ratio image: shadows become bright (normalised)
    ratio = gray.astype(np.float32) / (bg.astype(np.float32) + 1e-5)
    shadow_mask = (ratio < 0.65).astype(np.float32)  # areas that are significantly darker

    # If no significant shadow detected, skip
    if shadow_mask.sum() < frame.shape[0] * frame.shape[1] * 0.02:
        return frame

    # Brighten shadowed areas
    hsv = cv2.cvtColor(frame, cv2.COLOR_RGB2HSV).astype(np.float32)
    boost = 1.0 + shadow_mask * 0.5  # brighten shadow regions by up to 50%
    hsv[:, :, 2] = np.clip(hsv[:, :, 2] * boost, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)


# ── main pipeline ────────────────────────────────────────────────────────────

def preprocess_frame(
    frame: np.ndarray,
    config: Optional[PreprocessConfig] = None,
) -> Tuple[np.ndarray, dict]:
    """
    Run the full preprocessing pipeline on a single RGB frame.

    Returns:
        (enhanced_frame, report_dict)

    The report_dict contains:
        - quality metrics (before)
        - which stages were applied
        - quality metrics (after)
    """
    cfg = config or _config

    if not _CV2_AVAILABLE:
        return frame, {"skipped": True, "reason": "opencv not installed"}

    report: dict = {"stages_applied": []}

    # Assess input quality
    quality_before = assess_quality(frame)
    report["quality_before"] = quality_before

    # Auto-skip if image is already good
    if cfg.auto_skip_if_good:
        lo, hi = cfg.brightness_ok_range
        brightness_ok = lo <= quality_before["mean_brightness"] <= hi
        contrast_ok = quality_before["std_brightness"] >= cfg.contrast_ok_min
        sharp_ok = quality_before["laplacian_variance"] >= 100
        if brightness_ok and contrast_ok and sharp_ok:
            report["skipped"] = True
            report["reason"] = "image quality is acceptable"
            report["quality_after"] = quality_before
            return frame, report

    result = frame.copy()

    # Stage 1 — Shadow removal (before brightness adjustment)
    if cfg.enable_shadow_removal:
        try:
            result = _apply_shadow_removal(result, cfg)
            report["stages_applied"].append("shadow_removal")
        except Exception as e:
            logger.debug("Shadow removal failed: %s", e)

    # Stage 2 — CLAHE (adaptive contrast)
    if cfg.enable_clahe and (quality_before["is_low_contrast"] or quality_before["is_low_light"]):
        try:
            result = _apply_clahe(result, cfg)
            report["stages_applied"].append("clahe")
        except Exception as e:
            logger.debug("CLAHE failed: %s", e)

    # Stage 3 — Gamma correction (brightness)
    if cfg.enable_gamma and (quality_before["is_low_light"] or quality_before["is_overexposed"]):
        try:
            result = _apply_gamma(result, cfg)
            report["stages_applied"].append("gamma_correction")
        except Exception as e:
            logger.debug("Gamma correction failed: %s", e)

    # Stage 4 — Denoise (rain / electronic noise)
    if cfg.enable_denoise:
        try:
            result = _apply_denoise(result, cfg)
            report["stages_applied"].append("bilateral_denoise")
        except Exception as e:
            logger.debug("Denoising failed: %s", e)

    # Stage 5 — Sharpen (motion blur)
    if cfg.enable_sharpen and quality_before["is_blurry"]:
        try:
            result = _apply_sharpen(result, cfg)
            report["stages_applied"].append("unsharp_mask")
        except Exception as e:
            logger.debug("Sharpening failed: %s", e)

    quality_after = assess_quality(result)
    report["quality_after"] = quality_after
    report["skipped"] = False

    logger.debug(
        "Preprocessing applied %d stages: %s",
        len(report["stages_applied"]),
        ", ".join(report["stages_applied"]) or "none",
    )
    return result, report
