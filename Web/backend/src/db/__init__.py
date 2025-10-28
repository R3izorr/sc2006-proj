from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator, TYPE_CHECKING, Any

from dotenv import load_dotenv

# SQLAlchemy is added in requirements during DB phases.
try:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
except Exception:  # pragma: no cover - during early phases before deps are installed
    create_engine = None  # type: ignore
    sessionmaker = None  # type: ignore


if TYPE_CHECKING:
    from sqlalchemy.orm import Session  # type: ignore
else:
    Session = Any  # type: ignore

_engine = None
_SessionLocal = None


def _ensure_engine():
    global _engine, _SessionLocal
    if _engine is not None:
        return
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL not set in environment (.env)")
    if create_engine is None or sessionmaker is None:
        raise RuntimeError("SQLAlchemy is not installed. Add it to requirements and install.")
    _engine = create_engine(database_url, pool_pre_ping=True, future=True)
    _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)


@contextmanager
def get_session() -> Iterator["Session"]:
    """Provide a transactional session scope.

    Usage:
        with get_session() as session:
            ...
    """
    _ensure_engine()
    assert _SessionLocal is not None
    session = _SessionLocal()  # type: ignore[call-arg]
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


