from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.db_models import User


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    return session.execute(select(User).where(User.email == email)).scalars().first()


def get_user_by_id(session: Session, user_id: str) -> Optional[User]:
    return session.execute(select(User).where(User.id == user_id)).scalars().first()


def create_user(session: Session, *, email: str, password_hash: str, role: str = "user") -> str:
    u = User(email=email, password_hash=password_hash, role=role)
    session.add(u)
    session.flush()
    return u.id











