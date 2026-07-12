import os

from fastapi import APIRouter, HTTPException, Request, Response, status

from auth.models import OnboardingData, UserCreate, UserLogin, UserResponse
from auth import session as session_manager
from auth import utils as auth_utils
from db import users as user_queries

router = APIRouter(prefix="/auth", tags=["auth"])

# Cookie flags. Defaults (lax / not-secure) suit same-origin local dev.
# For a cross-site deployment (frontend and backend on different domains),
# browsers only store the session cookie if it is SameSite=None; Secure, so
# set COOKIE_SAMESITE=none and COOKIE_SECURE=true in that environment.
_COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"


def _set_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite=_COOKIE_SAMESITE,
        secure=_COOKIE_SECURE,
        max_age=86400,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, response: Response):
    existing = user_queries.get_user_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = auth_utils.hash_password(data.password)
    user = user_queries.create_user(data.email, password_hash)

    session_id = session_manager.create_session(user["id"])
    _set_session_cookie(response, session_id)

    return UserResponse(
        id=user["id"],
        email=user["email"],
        role=user["role"],
        created_at=user.get("created_at"),
    )


@router.post("/login")
async def login(data: UserLogin, response: Response):
    user = user_queries.get_user_by_email(data.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not auth_utils.verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session_id = session_manager.create_session(user["id"])
    _set_session_cookie(response, session_id)

    return UserResponse(
        id=user["id"],
        email=user["email"],
        role=user["role"],
        created_at=user.get("created_at"),
    )


@router.post("/logout")
async def logout(request: Request, response: Response):
    session_id = request.cookies.get("session_id")
    if session_id:
        session_manager.delete_session(session_id)
    response.delete_cookie(
        key="session_id", samesite=_COOKIE_SAMESITE, secure=_COOKIE_SECURE
    )
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def me(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = session_manager.get_session(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Session expired")

    user = user_queries.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user["id"],
        email=user["email"],
        role=user["role"],
        onboarding=user.get("onboarding"),
        created_at=user.get("created_at"),
    )


@router.post("/onboarding")
async def save_onboarding(data: OnboardingData, request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = session_manager.get_session(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Session expired")

    updated = user_queries.set_user_onboarding(user_id, data.model_dump())
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Onboarding saved"}
