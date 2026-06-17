from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.camera import Camera
from app.models.user import User
from app.api.deps import get_current_user, require_admin, require_officer_or_admin
from app.schemas.camera import CameraCreate, CameraUpdate, CameraOut
from app.services.ingestion import process_frame

router = APIRouter(prefix="/cameras", tags=["Cameras"])


@router.get("/", response_model=List[CameraOut])
def list_cameras(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Camera)
    if status:
        query = query.filter(Camera.status == status)
    cameras = query.order_by(Camera.name).all()
    result = []
    for cam in cameras:
        data = cam.__dict__.copy()
        data.pop("_sa_instance_state", None)
        data["violation_count"] = len(cam.violations)
        result.append(CameraOut.model_validate(data))
    return result


@router.post("/", response_model=CameraOut, status_code=201)
def create_camera(
    payload: CameraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    camera = Camera(**payload.model_dump())
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


@router.get("/{camera_id}", response_model=CameraOut)
def get_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    data = camera.__dict__.copy()
    data.pop("_sa_instance_state", None)
    data["violation_count"] = len(camera.violations)
    return CameraOut.model_validate(data)


@router.patch("/{camera_id}", response_model=CameraOut)
def update_camera(
    camera_id: int,
    payload: CameraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(camera, key, val)
    db.commit()
    db.refresh(camera)
    return camera


@router.delete("/{camera_id}", status_code=204)
def delete_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    db.delete(camera)
    db.commit()


@router.post("/{camera_id}/ingest", summary="Upload frame for ML processing")
async def ingest_frame(
    camera_id: int,
    file: UploadFile = File(...),
    frame_number: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin),
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    image_bytes = await file.read()
    result = process_frame(
        db=db,
        camera=camera,
        image_bytes=image_bytes,
        frame_number=frame_number,
        frame_timestamp=datetime.utcnow(),
    )
    return result
