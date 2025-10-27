from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.post("/login")
def login():
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.post("/logout")
def logout():
    return {"ok": True}

@router.post("/register")
def register():
    raise HTTPException(status_code=501, detail="Not implemented yet")


