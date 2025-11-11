from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..controllers import admin_controller
from .deps import db_session, require_admin

router = APIRouter()

class RefreshBody(BaseModel):
    note: Optional[str] = None
    created_by: Optional[str] = None
    geojson: Optional[dict[str, Any]] = None


@router.post("/refresh")
def refresh(body: RefreshBody | None = None, session: Session = Depends(db_session), _admin=Depends(require_admin)):
    if not body or not body.geojson:
        raise HTTPException(status_code=400, detail="Provide geojson in body.geojson")
    return admin_controller.refresh_snapshot(
        session,
        geojson=body.geojson,
        note=body.note,
        created_by=body.created_by,
        export_dir="data/out",
    )

@router.get("/snapshots")
def list_snapshots(session: Session = Depends(db_session), _admin=Depends(require_admin)):
    return {"snapshots": admin_controller.list_snapshots(session)}

@router.post("/snapshots/{snapshot_id}/restore")
def restore_snapshot(snapshot_id: str, session: Session = Depends(db_session), _admin=Depends(require_admin)):
    return admin_controller.restore_snapshot(session, snapshot_id, export_dir="data/out")


# ---- User management ----

from pydantic import EmailStr


class CreateAdminBody(BaseModel):
    email: EmailStr
    password: str


@router.get("/users")
def list_users(session: Session = Depends(db_session), _admin=Depends(require_admin)):
    return {"users": admin_controller.list_users(session)}


@router.post("/users")
def create_admin_user(body: CreateAdminBody, session: Session = Depends(db_session), _admin=Depends(require_admin)):
    try:
        return admin_controller.create_admin_user(session, email=body.email, password=body.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/users/{user_id}")
def delete_user(user_id: str, session: Session = Depends(db_session), admin=Depends(require_admin)):
    try:
        return admin_controller.delete_user(session, user_id=user_id, current_user_id=admin.get("id"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

