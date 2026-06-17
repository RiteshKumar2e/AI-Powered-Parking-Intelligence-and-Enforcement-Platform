"""
Evidence storage service. Supports local filesystem and S3/MinIO.
"""
import os
import hashlib
import logging
import uuid
from typing import Optional, BinaryIO
from datetime import datetime
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self):
        self.backend = settings.STORAGE_BACKEND
        self.local_path = Path(settings.LOCAL_STORAGE_PATH)
        self._s3_client = None

        if self.backend == "local":
            self.local_path.mkdir(parents=True, exist_ok=True)
            (self.local_path / "evidence").mkdir(exist_ok=True)
            (self.local_path / "annotated").mkdir(exist_ok=True)
            (self.local_path / "plates").mkdir(exist_ok=True)

    def _get_s3_client(self):
        if self._s3_client is None:
            import boto3
            self._s3_client = boto3.client(
                "s3",
                region_name=settings.S3_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        return self._s3_client

    def save_image(
        self, data: bytes, subfolder: str = "evidence", extension: str = "jpg"
    ) -> tuple[str, str]:
        """
        Save image bytes. Returns (file_path, public_url).
        """
        filename = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{extension}"

        if self.backend == "local":
            folder = self.local_path / subfolder
            folder.mkdir(parents=True, exist_ok=True)
            file_path = folder / filename
            file_path.write_bytes(data)
            relative = f"/storage/{subfolder}/{filename}"
            return str(file_path), relative

        elif self.backend == "s3":
            key = f"{subfolder}/{filename}"
            client = self._get_s3_client()
            client.put_object(
                Bucket=settings.S3_BUCKET,
                Key=key,
                Body=data,
                ContentType=f"image/{extension}",
            )
            url = f"https://{settings.S3_BUCKET}.s3.{settings.S3_REGION}.amazonaws.com/{key}"
            return key, url

        raise ValueError(f"Unknown storage backend: {self.backend}")

    def get_file_url(self, file_path: str) -> str:
        if file_path.startswith("/storage/"):
            return file_path
        return file_path

    def delete_file(self, file_path: str):
        if self.backend == "local":
            try:
                Path(file_path).unlink(missing_ok=True)
            except Exception as e:
                logger.warning(f"Failed to delete {file_path}: {e}")


_storage: Optional[StorageService] = None


def get_storage() -> StorageService:
    global _storage
    if _storage is None:
        _storage = StorageService()
    return _storage
