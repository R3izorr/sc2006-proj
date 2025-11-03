from __future__ import annotations

import os
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Optional, Tuple

import jwt
from passlib.context import CryptContext
from sqlalchemy import delete
from sqlalchemy.orm import Session

from ..models.refresh_token import RefreshToken
from ..models.user import User


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def validate_password_policy(password: str) -> tuple[bool, str]:
    """Validate password meets security policy.
    
    Returns (True, "") if valid, or (False, error_message) if invalid.
    Policy: min 8 chars, uppercase, lowercase, number, special char.
    """
    import re
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\\/;'`~]", password):
        return False, "Password must contain at least one special character"
    return True, ""


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(password, password_hash)
    except Exception:
        return False


@dataclass
class TokenPair:
    access_token: str
    access_expires_at: int
    refresh_token: str
    refresh_expires_at: int


def _now_ts() -> int:
    return int(time.time())


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        # Developer fallback for local use; replace in production
        secret = "dev-insecure-secret-change-me"
    return secret


def _jwt_issuer() -> str:
    return os.getenv("JWT_ISS", "hawker-app")


def issue_token_pair(*, user_id: str, role: str) -> TokenPair:
    """Create access + refresh tokens.

    Access: JWT (15 minutes by default)
    Refresh: random string (30 days default) stored hashed in DB by caller using create_refresh_token().
    """
    access_ttl = int(os.getenv("ACCESS_TOKEN_TTL", "900"))  # 15m
    refresh_ttl = int(os.getenv("REFRESH_TOKEN_TTL", "2592000"))  # 30d
    now = _now_ts()
    access_payload = {
        "sub": user_id,
        "role": role,
        "iss": _jwt_issuer(),
        "iat": now,
        "exp": now + access_ttl,
    }
    access_token = jwt.encode(access_payload, _jwt_secret(), algorithm="HS256")
    refresh_token = secrets.token_urlsafe(48)
    return TokenPair(
        access_token=access_token,
        access_expires_at=now + access_ttl,
        refresh_token=refresh_token,
        refresh_expires_at=now + refresh_ttl,
    )


def verify_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=["HS256"], options={"require": ["exp", "iat", "sub"]})
        return payload
    except Exception:
        return None


def _hash_refresh(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def create_refresh_token(session: Session, *, user_id: str, refresh_token: str, expires_at_ts: int) -> str:
    rt = RefreshToken(
        user_id=user_id,
        token_hash=_hash_refresh(refresh_token),
        expires_at=datetime.fromtimestamp(expires_at_ts, tz=timezone.utc),
    )
    session.add(rt)
    session.flush()
    return rt.id


def revoke_refresh_token(session: Session, *, refresh_token: str) -> int:
    th = _hash_refresh(refresh_token)
    # Soft revoke by setting revoked_at; here we delete for simplicity
    res = session.query(RefreshToken).filter(RefreshToken.token_hash == th).delete()
    return int(res or 0)


def rotate_refresh_token(session: Session, *, old_refresh_token: str, user_id: str) -> Tuple[str, int]:
    revoke_refresh_token(session, refresh_token=old_refresh_token)
    pair = issue_token_pair(user_id=user_id, role="client")
    create_refresh_token(session, user_id=user_id, refresh_token=pair.refresh_token, expires_at_ts=pair.refresh_expires_at)
    return pair.refresh_token, pair.refresh_expires_at

def verify_credentials(email: str, password: str) -> bool:
    return False


