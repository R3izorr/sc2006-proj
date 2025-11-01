from __future__ import annotations

from typing import Any, Dict

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..db import get_session
from ..repositories import user_repo
from ..services import auth_service


def db_session() -> Session:
    # FastAPI dependency wrapper around contextmanager
    with get_session() as s:
        yield s


def get_current_user(request: Request, session: Session = Depends(db_session)) -> Dict[str, Any]:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Bearer token")
    token = auth.split(" ", 1)[1].strip()
    payload = auth_service.verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    user = user_repo.get_user_by_id(session, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "display_name": getattr(user, "display_name", None),
        "industry": getattr(user, "industry", None),
        "phone": getattr(user, "phone", None),
        "picture_url": getattr(user, "picture_url", None),
    }


def require_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return user


















