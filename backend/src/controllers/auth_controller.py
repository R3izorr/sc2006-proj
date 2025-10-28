from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.db_models import RefreshToken, User
from ..repositories import user_repo
from ..services import auth_service


def register(session: Session, *, email: str, password: str, role: str = "user") -> dict[str, Any]:
    if user_repo.get_user_by_email(session, email):
        raise ValueError("Email already registered")
    ph = auth_service.hash_password(password)
    uid = user_repo.create_user(session, email=email, password_hash=ph, role=role)
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



