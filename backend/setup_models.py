"""
Run once to download YOLO models into backend/models/ so they live
with the project and work offline after that.

Usage:
    cd backend
    python setup_models.py
"""
import sys
import os
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

TARGETS = [
    "yolov8n.pt",
    "yolov8s.pt",
]

def download(name: str):
    dest = MODELS_DIR / name
    if dest.exists():
        print(f"  OK  {name} already present ({dest.stat().st_size // 1024} KB)")
        return

    print(f"  >> Downloading {name} ...")
    try:
        from ultralytics import YOLO
        model = YOLO(name)
        cached = Path(model.ckpt_path if hasattr(model, "ckpt_path") else name)
        if cached.exists() and cached != dest:
            import shutil
            shutil.copy2(cached, dest)
            print(f"  OK  Saved to {dest}")
        elif (Path.cwd() / name).exists():
            import shutil
            shutil.move(str(Path.cwd() / name), dest)
            print(f"  OK  Moved to {dest}")
        else:
            print(f"  OK  {name} available via ultralytics cache")
    except ImportError:
        print("  FAIL  ultralytics not installed -- run: pip install ultralytics")
        sys.exit(1)
    except Exception as e:
        print(f"  FAIL  {e}")

def main():
    print("=== ParkIQ Model Setup ===")
    print(f"Target dir: {MODELS_DIR}\n")
    for m in TARGETS:
        download(m)
    print("\nDone. .env is already set to: YOLO_MODEL_PATH=models/yolov8s.pt")

if __name__ == "__main__":
    main()
