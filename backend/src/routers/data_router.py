from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
OUT_PATH = BASE_DIR / "content" / "out" / "hawker_opportunities_ver2.geojson"
HAWKERS_PATH = BASE_DIR / "content" / "HawkerCentresGEOJSON.geojson"
MRT_EXITS_PATH = BASE_DIR / "content" / "LTAMRTStationExitGEOJSON.geojson"

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


