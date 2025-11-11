from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.user import User


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    return session.execute(select(User).where(User.email == email)).scalars().first()


def get_user_by_id(session: Session, user_id: str) -> Optional[User]:
    return session.execute(select(User).where(User.id == user_id)).scalars().first()


def create_user(
    session: Session,
    *,
    email: str,
    password_hash: Optional[str],
    role: str = "client",
    display_name: Optional[str] = None,
    industry: Optional[str] = None,
    phone: Optional[str] = None,
    email_verified: bool = False,
) -> str:
    u = User(
        email=email,
        password_hash=password_hash,
        role=role,
        display_name=display_name,
        industry=industry,
        phone=phone,
        email_verified=email_verified,
    )
    session.add(u)
    session.flush()
    return u.id


def list_users(session: Session) -> list[User]:
    return session.execute(select(User)).scalars().all()


def get_user_by_google_sub(session: Session, google_sub: str) -> Optional[User]:
    return session.execute(select(User).where(User.google_sub == google_sub)).scalars().first()


def delete_user(session: Session, user_id: str) -> int:
    u = get_user_by_id(session, user_id)
    if not u:
        return 0
    session.delete(u)
    return 1


def update_user_profile(
    session: Session,
    *,
    user_id: str,
    display_name: Optional[str] = None,
    industry: Optional[str] = None,
    phone: Optional[str] = None,
    picture_url: Optional[str] = None,
) -> bool:
    u = get_user_by_id(session, user_id)
    if not u:
        return False
    if display_name is not None:
        u.display_name = display_name
    if industry is not None:
        u.industry = industry
    if phone is not None:
        u.phone = phone
    if picture_url is not None:
        u.picture_url = picture_url
    return True













