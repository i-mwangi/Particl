from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class User(BaseModel):
    id: Optional[str] = None
    email: str
    password_hash: Optional[str] = None
    role: str = "user"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    onboarding: Optional[dict] = None
    created_at: Optional[datetime] = None


class OnboardingData(BaseModel):
    use_case: str
    use_case_detail: str = ""
    source: str
    source_detail: str = ""
