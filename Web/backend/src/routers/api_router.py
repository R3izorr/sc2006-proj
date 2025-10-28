from fastapi import APIRouter
from .data_router import router as data_router
from .admin_router import router as admin_router
from .config_router import router as config_router
from .auth_router import router as auth_router
from .subzones_router import router as subzones_router
from .export_router import router as export_router

api_router = APIRouter()
api_router.include_router(data_router, prefix="/data", tags=["data"])
api_router.include_router(subzones_router, prefix="/subzones", tags=["subzones"])
api_router.include_router(config_router, prefix="/config", tags=["config"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(export_router, prefix="/export", tags=["export"])


