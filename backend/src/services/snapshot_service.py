from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

from sqlalchemy.orm import Session

from ..repositories import snapshot_repo, subzone_repo


def bulk_ingest_geojson(session: Session, geojson: dict[str, Any], snapshot_id: str) -> int:
    """Insert all features from a GeoJSON FeatureCollection for the snapshot.

    Returns the number of inserted rows.
    """
    feats = (geojson or {}).get("features") or []
    return subzone_repo.insert_many(session, snapshot_id, feats)


def export_current_geojson(session: Session, snapshot_id: str, export_dir: str | Path) -> Path:
    """Assemble a FeatureCollection from DB and write it to the export directory.

    The filename is hawker_opportunities_ver2.geojson to match the frontend expectation.
    """
    fc = subzone_repo.select_features_fc(session, snapshot_id)
    export_dir = Path(export_dir)
    export_dir.mkdir(parents=True, exist_ok=True)
    out_path = export_dir / "hawker_opportunities_ver2.geojson"
    out_path.write_text(_json_dumps(fc), encoding="utf-8")
    return out_path


def create_snapshot_and_ingest(
    session: Session,
    *,
    geojson: dict[str, Any],
    note: Optional[str] = None,
    created_by: Optional[str] = None,
    set_current: bool = True,
) -> str:
    """Create a snapshot and ingest all features. Returns snapshot_id.

    Controller should call export_current_geojson() after marking current.
    """
    sid = snapshot_repo.create_snapshot(session, note=note, created_by=created_by)
    bulk_ingest_geojson(session, geojson, sid)
    if set_current:
        snapshot_repo.set_current_snapshot(session, sid)
    return sid


def _json_dumps(obj: Any) -> str:
    import json

    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))

from pathlib import Path
from typing import List
from ..models.snapshot import Snapshot

def list_snapshots(out_dir: Path) -> List[Snapshot]:
    return []


