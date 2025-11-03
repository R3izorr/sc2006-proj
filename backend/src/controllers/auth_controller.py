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
from ..services import email_service


def register(
    session: Session,
    *,
    email: str,
    password: str,
    role: str = "client",
    display_name: Optional[str] = None,
    industry: Optional[str] = None,
    phone: Optional[str] = None,
) -> dict[str, Any]:
    if user_repo.get_user_by_email(session, email):
        raise ValueError("Email already registered")
    valid, msg = auth_service.validate_password_policy(password)
    if not valid:
        raise ValueError(msg)
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
    # send verification email
    user = user_repo.get_user_by_id(session, uid)
    if user:
        import secrets
        token = secrets.token_urlsafe(48)
        user.email_verification_token = token
        user.email_verification_sent_at = datetime.now(timezone.utc)
        base_url = os.getenv("APP_BASE_URL", "http://127.0.0.1:5173")
        verify_url = f"{base_url}/#/verify-email?token={token}"
        try:
            email_service.send_email_verification(email, verify_url)
        except Exception:
            pass
    return {"user_id": uid, "message": "Registration successful. Please verify your email to sign in."}


def login(session: Session, *, email: str, password: str) -> dict[str, Any]:
    user = user_repo.get_user_by_email(session, email)
    if not user or not auth_service.verify_password(password, user.password_hash):
        raise ValueError("Invalid credentials")
    if not user.email_verified:
        raise ValueError("Email not verified")
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
        valid, msg = auth_service.validate_password_policy(new_password)
        if not valid:
            raise ValueError(msg)
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
            uid = user_repo.create_user(session, email=email, password_hash=None, role="client")
            user = user_repo.get_user_by_id(session, uid)
            user.google_sub = sub
            user.display_name = name
            user.picture_url = picture

    if not user.email_verified:
        user.email_verified = True
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


def request_password_reset(session: Session, *, email: str, ip_address: str | None = None) -> dict[str, Any]:
    try:
        u = user_repo.get_user_by_email(session, email)
        if u and u.email_verified:
            import secrets
            token = secrets.token_urlsafe(48)
            u.password_reset_token = token
            u.password_reset_sent_at = datetime.now(timezone.utc)
            base_url = os.getenv("APP_BASE_URL", "http://127.0.0.1:5173")
            reset_url = f"{base_url}/#/reset-password?token={token}"
            email_service.send_password_reset(email, reset_url)
    except Exception:
        pass
    return {"ok": True}


def reset_password(session: Session, *, token: str, new_password: str) -> dict[str, Any]:
    valid, msg = auth_service.validate_password_policy(new_password)
    if not valid:
        raise ValueError(msg)
    u = session.execute(select(User).where(User.password_reset_token == token)).scalars().first()
    if not u:
        raise ValueError("Invalid or expired reset token")
    ttl_h = int(os.getenv("TOKEN_TTL_PW_RESET_HOURS", "1"))
    if u.password_reset_sent_at and (datetime.now(timezone.utc) - u.password_reset_sent_at).total_seconds() > ttl_h * 3600:
        raise ValueError("Reset token expired")
    u.password_reset_token = None
    u.password_reset_sent_at = None
    u.password_hash = auth_service.hash_password(new_password)
    return {"ok": True}


def verify_email(session: Session, *, token: str) -> dict[str, Any]:
    u = session.execute(select(User).where(User.email_verification_token == token)).scalars().first()
    if not u:
        raise ValueError("Invalid or expired verification token")
    ttl_h = int(os.getenv("TOKEN_TTL_EMAIL_VERIFY_HOURS", "24"))
    if u.email_verification_sent_at and (datetime.now(timezone.utc) - u.email_verification_sent_at).total_seconds() > ttl_h * 3600:
        raise ValueError("Verification token expired")
    u.email_verified = True
    u.email_verification_token = None
    u.email_verification_sent_at = None
    return {"ok": True}


def resend_verification_email(session: Session, *, email: str) -> dict[str, Any]:
    u = user_repo.get_user_by_email(session, email)
    if not u or u.email_verified:
        return {"ok": True}
    import secrets
    token = secrets.token_urlsafe(48)
    u.email_verification_token = token
    u.email_verification_sent_at = datetime.now(timezone.utc)
    base_url = os.getenv("APP_BASE_URL", "http://127.0.0.1:5173")
    verify_url = f"{base_url}/#/verify-email?token={token}"
    try:
        email_service.send_email_verification(u.email, verify_url)
    except Exception:
        pass
    return {"ok": True}
