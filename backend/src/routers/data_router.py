from __future__ import annotations

from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from ..controllers import data_controller
from .deps import db_session, get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
OUT_PATH = BASE_DIR / "data" / "out" / "hawker_opportunities_ver2.geojson"
HAWKERS_PATH = BASE_DIR / "data" / "HawkerCentresGEOJSON.geojson"
MRT_EXITS_PATH = BASE_DIR / "data" / "LTAMRTStationExitGEOJSON.geojson"
BUS_STOPS_PATH = BASE_DIR / "data" / "bus_stops.geojson"

# Prevent stale/cached responses being served without auth
NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "Vary": "Authorization",
}

@router.get("/opportunity.geojson")
def opportunity_geojson():
    if not OUT_PATH.exists():
        raise HTTPException(status_code=404, detail="GeoJSON not found in data/out/")
    return FileResponse(str(OUT_PATH), media_type="application/geo+json", headers=NO_CACHE_HEADERS)


@router.get("/hawker-centres.geojson")
def hawker_centres_geojson():
    if not HAWKERS_PATH.exists():
        raise HTTPException(status_code=404, detail="Hawker centres GeoJSON not found in data/")
    return FileResponse(str(HAWKERS_PATH), media_type="application/geo+json", headers=NO_CACHE_HEADERS)


@router.get("/mrt-exits.geojson")
def mrt_exits_geojson():
    if not MRT_EXITS_PATH.exists():
        raise HTTPException(status_code=404, detail="MRT exits GeoJSON not found in data/")
    return FileResponse(str(MRT_EXITS_PATH), media_type="application/geo+json", headers=NO_CACHE_HEADERS)


@router.get("/bus-stops.geojson")
def bus_stops_geojson():
    if not BUS_STOPS_PATH.exists():
        raise HTTPException(status_code=404, detail="Bus stops GeoJSON not found in data/")
    return FileResponse(str(BUS_STOPS_PATH), media_type="application/geo+json", headers=NO_CACHE_HEADERS)

@router.get("/opportunity-db.geojson")
def opportunity_db_geojson(session: Session = Depends(db_session)):
    fc = data_controller.get_opportunity_geojson(session)
    return JSONResponse(fc, media_type="application/geo+json", headers=NO_CACHE_HEADERS)

