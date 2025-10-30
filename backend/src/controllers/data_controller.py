from __future__ import annotations

from typing import Any, Optional

from sqlalchemy.orm import Session

from ..repositories import snapshot_repo, subzone_repo


def get_opportunity_geojson(session: Session, *, snapshot: Optional[str] = None) -> dict[str, Any]:
    """Return a FeatureCollection for the given snapshot id or the current snapshot.
    Pass snapshot=None or 'current' to use the current snapshot.
    """
    sid = snapshot
    if not sid or sid == "current":
        sid = snapshot_repo.get_current_snapshot_id(session)
    if not sid:
        return {"type": "FeatureCollection", "features": []}
    return subzone_repo.select_features_fc(session, sid)


def list_subzones(
    session: Session,
    *,
    planning_area: Optional[str] = None,
    rank_top: Optional[int] = None,
    snapshot: Optional[str] = None,
) -> list[dict[str, Any]]:
    sid = snapshot
    if not sid or sid == "current":
        sid = snapshot_repo.get_current_snapshot_id(session)
    if not sid:
        return []
    return subzone_repo.select_subzones(session, sid, planning_area=planning_area, rank_top=rank_top)













