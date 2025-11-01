from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
import os

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.refresh_token import RefreshToken
from ..models.user import User
from ..repositories import user_repo
from ..services import auth_service


def register(
    session: Session,
    *,
    email: str,
    password: str,
    role: str = "user",
    display_name: Optional[str] = None,
    industry: Optional[str] = None,
    phone: Optional[str] = None,
) -> dict[str, Any]:
    if user_repo.get_user_by_email(session, email):
        raise ValueError("Email already registered")
    ph = auth_service.hash_password(password)
    uid = user_repo.create_user(
        session,
        email=email,
        password_hash=ph,
        role=role,
        display_name=display_name,
        industry=industry,
        phone=phone,
    )
    return {"user_id": uid}


def login(session: Session, *, email: str, password: str) -> dict[str, Any]:
    user = user_repo.get_user_by_email(session, email)
    if not user or not auth_service.verify_password(password, user.password_hash):
        raise ValueError("Invalid credentials")
    pair = auth_service.issue_token_pair(user_id=user.id, role=user.role)
    auth_service.create_refresh_token(session, user_id=user.id, refresh_token=pair.refresh_token, expires_at_ts=pair.refresh_expires_at)
    user.last_login_at = datetime.now(timezone.utc)
    return {
        "access_token": pair.access_token,
        "access_expires_at": pair.access_expires_at,
        "refresh_token": pair.refresh_token,
        "refresh_expires_at": pair.refresh_expires_at,
        "user": {"id": user.id, "email": user.email, "role": user.role},
    }


def refresh(session: Session, *, refresh_token: str) -> dict[str, Any]:
    # Validate the refresh token exists and is not expired
    from hashlib import sha256
    th = sha256(refresh_token.encode("utf-8")).hexdigest()
    rt = session.execute(select(RefreshToken).where(RefreshToken.token_hash == th)).scalars().first()
    if not rt or (rt.expires_at and rt.expires_at < datetime.now(timezone.utc)) or rt.revoked_at:
        raise ValueError("Invalid refresh token")

    user = session.get(User, rt.user_id)
    if not user:
        raise ValueError("User not found")

    # Rotate
    auth_service.revoke_refresh_token(session, refresh_token=refresh_token)
    pair = auth_service.issue_token_pair(user_id=user.id, role=user.role)
    auth_service.create_refresh_token(session, user_id=user.id, refresh_token=pair.refresh_token, expires_at_ts=pair.refresh_expires_at)
    return {
        "access_token": pair.access_token,
        "access_expires_at": pair.access_expires_at,
        "refresh_token": pair.refresh_token,
        "refresh_expires_at": pair.refresh_expires_at,
    }


def logout(session: Session, *, refresh_token: str) -> dict[str, Any]:
    auth_service.revoke_refresh_token(session, refresh_token=refresh_token)
    return {"ok": True}


def me(session: Session, *, user_id: str) -> dict[str, Any]:
    u = user_repo.get_user_by_id(session, user_id)
    if not u:
        raise ValueError("User not found")
    return {"id": u.id, "email": u.email, "role": u.role, "created_at": u.created_at.isoformat() if u.created_at else None}


def get_profile(session: Session, *, user_id: str) -> dict[str, Any]:
    u = user_repo.get_user_by_id(session, user_id)
    if not u:
        raise ValueError("User not found")
    return {
        "id": u.id,
        "email": u.email,
        "role": u.role,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "display_name": getattr(u, "display_name", None),
        "industry": getattr(u, "industry", None),
        "phone": getattr(u, "phone", None),
        "picture_url": getattr(u, "picture_url", None),
    }


def update_profile(
    session: Session,
    *,
    user_id: str,
    display_name: str | None = None,
    industry: str | None = None,
    phone: str | None = None,
    picture_url: str | None = None,
    current_password: str | None = None,
    new_password: str | None = None,
) -> dict[str, Any]:
    u = user_repo.get_user_by_id(session, user_id)
    if not u:
        raise ValueError("User not found")

    # Update profile fields
    user_repo.update_user_profile(
        session,
        user_id=user_id,
        display_name=display_name,
        industry=industry,
        phone=phone,
        picture_url=picture_url,
    )

    # Handle password change if requested
    if new_password:
        if u.password_hash:  # existing password present -> verify current
            if not current_password or not auth_service.verify_password(current_password, u.password_hash):
                raise ValueError("Current password incorrect")
        u.password_hash = auth_service.hash_password(new_password)

    return get_profile(session, user_id=user_id)


def login_with_google(session: Session, *, id_token_str: str) -> dict[str, Any]:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise ValueError("Server missing GOOGLE_CLIENT_ID")

    payload = google_id_token.verify_oauth2_token(
        id_token_str,
        google_requests.Request(),
        audience=client_id,
    )

    email = payload.get("email")
    email_verified = payload.get("email_verified")
    sub = payload.get("sub")
    name = payload.get("name")
    picture = payload.get("picture")

    if not email or not email_verified or not sub:
        raise ValueError("Invalid Google token")

    user = user_repo.get_user_by_google_sub(session, sub)
    if not user:
        user = user_repo.get_user_by_email(session, email)
        if user:
            user.google_sub = sub
            if name:
                user.display_name = name
            if picture:
                user.picture_url = picture
        else:
            uid = user_repo.create_user(session, email=email, password_hash=None, role="user")
            user = user_repo.get_user_by_id(session, uid)
            user.google_sub = sub
            user.display_name = name
            user.picture_url = picture

    pair = auth_service.issue_token_pair(user_id=user.id, role=user.role)
    auth_service.create_refresh_token(
        session, user_id=user.id, refresh_token=pair.refresh_token, expires_at_ts=pair.refresh_expires_at
    )
    user.last_login_at = datetime.now(timezone.utc)
    return {
        "access_token": pair.access_token,
        "access_expires_at": pair.access_expires_at,
        "refresh_token": pair.refresh_token,
        "refresh_expires_at": pair.refresh_expires_at,
        "user": {"id": user.id, "email": user.email, "role": user.role},
    }
