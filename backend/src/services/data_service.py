from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
CONTENT_DIR = BASE_DIR / "content"
OUT_GEOJSON = CONTENT_DIR / "out" / "hawker_opportunities_ver2.geojson"

__all__ = ["CONTENT_DIR", "OUT_GEOJSON"]


