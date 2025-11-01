from __future__ import annotations

from typing import Iterable, Optional

from sqlalchemy import update, select
from sqlalchemy.orm import Session

from ..models.db_models import Snapshot


def create_snapshot(session: Session, *, note: Optional[str] = None, created_by: Optional[str] = None) -> str:
    snap = Snapshot(note=note, created_by=created_by, is_current=False)
    session.add(snap)
    session.flush()  # obtain generated id
    return snap.id


def set_current_snapshot(session: Session, snapshot_id: str) -> None:
    # Unset previous
    session.execute(update(Snapshot).values(is_current=False).where(Snapshot.is_current.is_(True)))
    # Set new
    session.execute(update(Snapshot).values(is_current=True).where(Snapshot.id == snapshot_id))


def get_current_snapshot_id(session: Session) -> Optional[str]:
    row = session.execute(select(Snapshot.id).where(Snapshot.is_current.is_(True))).first()
    return row[0] if row else None


def list_snapshots(session: Session) -> list[Snapshot]:
    return list(session.execute(select(Snapshot).order_by(Snapshot.created_at.desc())).scalars())


def restore_snapshot(session: Session, snapshot_id: str) -> None:
    set_current_snapshot(session, snapshot_id)


















