from __future__ import annotations

from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from ..controllers import data_controller
from .deps import db_session

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
OUT_PATH = BASE_DIR / "content" / "out" / "hawker_opportunities_ver2.geojson"
HAWKERS_PATH = BASE_DIR / "content" / "HawkerCentresGEOJSON.geojson"
MRT_EXITS_PATH = BASE_DIR / "content" / "LTAMRTStationExitGEOJSON.geojson"
BUS_STOPS_PATH = BASE_DIR / "content" / "bus_stops.geojson"

@router.get("/opportunity.geojson")
def opportunity_geojson():
    if not OUT_PATH.exists():
        raise HTTPException(status_code=404, detail="GeoJSON not found in content/out/")
    return FileResponse(str(OUT_PATH), media_type="application/geo+json")


@router.get("/hawker-centres.geojson")
def hawker_centres_geojson():
    if not HAWKERS_PATH.exists():
        raise HTTPException(status_code=404, detail="Hawker centres GeoJSON not found in content/")
    return FileResponse(str(HAWKERS_PATH), media_type="application/geo+json")


@router.get("/mrt-exits.geojson")
def mrt_exits_geojson():
    if not MRT_EXITS_PATH.exists():
        raise HTTPException(status_code=404, detail="MRT exits GeoJSON not found in content/")
    return FileResponse(str(MRT_EXITS_PATH), media_type="application/geo+json")


@router.get("/bus-stops.geojson")
def bus_stops_geojson():
    if not BUS_STOPS_PATH.exists():
        raise HTTPException(status_code=404, detail="Bus stops GeoJSON not found in content/")
    return FileResponse(str(BUS_STOPS_PATH), media_type="application/geo+json")

@router.get("/opportunity-db.geojson")
def opportunity_db_geojson(session: Session = Depends(db_session)):
    fc = data_controller.get_opportunity_geojson(session)
    return JSONResponse(fc, media_type="application/geo+json")

