from fastapi import APIRouter
from ..models.kernel_config import KernelConfig

router = APIRouter()

_current = KernelConfig()

@router.get("/")
def get_config():
    return _current

@router.put("/")
def put_config(cfg: KernelConfig):
    global _current
    _current = cfg
    return {"ok": True}


