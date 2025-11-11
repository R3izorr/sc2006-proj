from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

from sqlalchemy.orm import Session

from ..repositories import snapshot_repo, user_repo
from ..services import snapshot_service, auth_service


def refresh_snapshot(
    session: Session,
    *,
    geojson: dict[str, Any],
    note: Optional[str] = None,
    created_by: Optional[str] = None,
    export_dir: str | Path = "data/out",
) -> dict[str, Any]:
    """Create a new snapshot from an uploaded/provided GeoJSON and make it current.

    Returns: { snapshot_id, inserted, export_path }
    """
    sid = snapshot_repo.create_snapshot(session, note=note, created_by=created_by)
    inserted = snapshot_service.bulk_ingest_geojson(session, geojson, sid)
    snapshot_repo.set_current_snapshot(session, sid)
    out = snapshot_service.export_current_geojson(session, sid, export_dir)
    return {"snapshot_id": sid, "inserted": inserted, "export_path": str(out)}


def list_snapshots(session: Session) -> list[dict[str, Any]]:
    snaps = snapshot_repo.list_snapshots(session)
    return [
        {
            "id": s.id,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "created_by": s.created_by,
            "note": s.note,
            "is_current": bool(s.is_current),
        }
        for s in snaps
    ]


def restore_snapshot(session: Session, snapshot_id: str, *, export_dir: str | Path = "data/out") -> dict[str, Any]:
    snapshot_repo.set_current_snapshot(session, snapshot_id)
    out = snapshot_service.export_current_geojson(session, snapshot_id, export_dir)
    return {"snapshot_id": snapshot_id, "export_path": str(out)}


# ---- User management (admin-only) ----

def list_users(session: Session) -> list[dict[str, Any]]:
    users = user_repo.list_users(session)
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


def create_admin_user(session: Session, *, email: str, password: str) -> dict[str, Any]:
    if user_repo.get_user_by_email(session, email):
        raise ValueError("Email already registered")
    ph = auth_service.hash_password(password)
    uid = user_repo.create_user(session, email=email, password_hash=ph, role="admin", email_verified=True)
    return {"user_id": uid}


def delete_user(session: Session, *, user_id: str, current_user_id: str) -> dict[str, Any]:
    if user_id == current_user_id:
        raise ValueError("Cannot delete current user")
    deleted = user_repo.delete_user(session, user_id)
    if deleted == 0:
        raise ValueError("User not found")
    return {"ok": True}












