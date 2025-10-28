from pathlib import Path
from fastapi import APIRouter
import json

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
OUT_PATH = BASE_DIR / "content"/"out"/ "hawker_opportunities_ver2.geojson"

@router.get("/")
def list_subzones():
    try:
        data = json.loads(OUT_PATH.read_text(encoding="utf-8"))
        names = []
        for f in data.get("features", []):
            p = f.get("properties", {})
            name = p.get("SUBZONE_N") or p.get("subzone")
            if name:
                names.append(name)
        return {"count": len(names), "subzones": sorted(set(names))}
    except Exception:
        return {"count": 0, "subzones": []}


