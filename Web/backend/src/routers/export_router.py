from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.post("/png")
def export_png():
    raise HTTPException(status_code=501, detail="Not implemented yet")


