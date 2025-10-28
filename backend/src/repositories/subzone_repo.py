from __future__ import annotations

from typing import Any, Iterable, Optional

from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from ..models.db_models import Subzone


def insert_many(session: Session, snapshot_id: str, features: Iterable[dict[str, Any]]) -> int:
    """Insert many subzone features for a snapshot.

    Each feature is expected to look like a GeoJSON Feature with `properties` and `geometry`.
    """
    rows: list[dict[str, Any]] = []
    for feat in features:
        props = (feat.get("properties") or {})
        geom = feat.get("geometry")
        row = {
            "snapshot_id": snapshot_id,
            "subzone_id": props.get("SUBZONE_N") or props.get("subzone"),
            "planning_area": props.get("PLN_AREA_N") or props.get("planning_area") or props.get("planarea"),
            "population": _int_or_none(props.get("population")),
            "pop_0_25": _int_or_none(props.get("pop_0_25")),
            "pop_25_65": _int_or_none(props.get("pop_25_65")),
            "pop_65plus": _int_or_none(props.get("pop_65plus")),
            "hawker": _int_or_none(props.get("hawker")),
            "mrt": _int_or_none(props.get("mrt")),
            "bus": _int_or_none(props.get("bus")),
            "h_score": _float_or_none(props.get("H_score") or props.get("h_score")),
            "h_rank": _int_or_none(props.get("H_rank") or props.get("h_rank")),
            "Dem": _float_or_none(props.get("Dem")),
            "Sup": _float_or_none(props.get("Sup")),
            "Acc": _float_or_none(props.get("Acc")),
            "geom_geojson": geom,
        }
        if not row["subzone_id"]:
            continue  # skip rows without identifier
        rows.append(row)
    if not rows:
        return 0
    session.execute(insert(Subzone), rows)
    return len(rows)


def select_features_fc(session: Session, snapshot_id: str) -> dict[str, Any]:
    """Return a GeoJSON FeatureCollection for the snapshot."""
    q = select(Subzone).where(Subzone.snapshot_id == snapshot_id)
    feats = []
    for sz in session.execute(q).scalars():
        props = {
            "SUBZONE_N": sz.subzone_id,
            "PLN_AREA_N": sz.planning_area,
            "population": sz.population,
            "pop_0_25": sz.pop_0_25,
            "pop_25_65": sz.pop_25_65,
            "pop_65plus": sz.pop_65plus,
            "hawker": sz.hawker,
            "mrt": sz.mrt,
            "bus": sz.bus,
            "H_score": sz.h_score,
            "H_rank": sz.h_rank,
            "Dem": sz.Dem,
            "Sup": sz.Sup,
            "Acc": sz.Acc,
        }
        feats.append({
            "type": "Feature",
            "properties": props,
            "geometry": sz.geom_geojson,
        })
    return {"type": "FeatureCollection", "features": feats}


def select_subzones(
    session: Session,
    snapshot_id: str,
    *,
    planning_area: Optional[str] = None,
    rank_top: Optional[int] = None,
) -> list[dict[str, Any]]:
    q = select(Subzone).where(Subzone.snapshot_id == snapshot_id)
    if planning_area:
        q = q.where(Subzone.planning_area == planning_area)
    if rank_top:
        q = q.where(Subzone.h_rank <= rank_top)
    result: list[dict[str, Any]] = []
    for sz in session.execute(q).scalars():
        result.append({
            "subzone": sz.subzone_id,
            "planning_area": sz.planning_area,
            "population": sz.population,
            "hawker": sz.hawker,
            "mrt": sz.mrt,
            "bus": sz.bus,
            "H_score": sz.h_score,
            "H_rank": sz.h_rank,
        })
    return result


def _int_or_none(v: Any) -> Optional[int]:
    try:
        n = int(v)
        return n
    except Exception:
        return None


def _float_or_none(v: Any) -> Optional[float]:
    try:
        n = float(v)
        return n
    except Exception:
        return None


