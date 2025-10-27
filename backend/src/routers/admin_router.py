from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.post("/refresh")
def refresh():
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/snapshots")
def list_snapshots():
    return {"snapshots": []}

@router.post("/snapshots/{snapshot_id}/restore")
def restore_snapshot(snapshot_id: str):
    raise HTTPException(status_code=501, detail="Not implemented yet")


