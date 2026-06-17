from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
