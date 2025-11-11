from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
OUT_GEOJSON = DATA_DIR / "out" / "hawker_opportunities_ver2.geojson"

__all__ = ["DATA_DIR", "OUT_GEOJSON"]


