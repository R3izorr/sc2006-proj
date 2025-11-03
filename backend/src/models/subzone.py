from __future__ import annotations

from typing import Optional

from sqlalchemy import Integer, JSON, PrimaryKeyConstraint, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Subzone(Base):
    __tablename__ = "subzones"

    snapshot_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False)
    subzone_id: Mapped[str] = mapped_column(String, nullable=False)

    planning_area: Mapped[Optional[str]] = mapped_column(String)
    population: Mapped[Optional[int]] = mapped_column(Integer)
    pop_0_25: Mapped[Optional[int]] = mapped_column(Integer)
    pop_25_65: Mapped[Optional[int]] = mapped_column(Integer)
    pop_65plus: Mapped[Optional[int]] = mapped_column(Integer)
    hawker: Mapped[Optional[int]] = mapped_column(Integer)
    mrt: Mapped[Optional[int]] = mapped_column(Integer)
    bus: Mapped[Optional[int]] = mapped_column(Integer)
    h_score: Mapped[Optional[float]] = mapped_column("h_score")
    h_rank: Mapped[Optional[int]] = mapped_column(Integer)

    # Optional component columns if available in properties
    Dem: Mapped[Optional[float]] = mapped_column("Dem")
    Sup: Mapped[Optional[float]] = mapped_column("Sup")
    Acc: Mapped[Optional[float]] = mapped_column("Acc")

    geom_geojson: Mapped[Optional[dict]] = mapped_column(JSON)

    __table_args__ = (
        PrimaryKeyConstraint("snapshot_id", "subzone_id"),
    )


