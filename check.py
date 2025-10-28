from backend.src.db import get_session
from backend.src.repositories.snapshot_repo import get_current_snapshot_id
from backend.src.repositories.subzone_repo import select_features_fc

with get_session() as s:
    sid = get_current_snapshot_id(s)
    fc = select_features_fc(s, sid)
    print(len(fc["features"]))