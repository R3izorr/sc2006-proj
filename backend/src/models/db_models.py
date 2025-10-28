from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    PrimaryKeyConstraint,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Snapshot(Base):
    __tablename__ = "snapshots"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    created_by: Mapped[Optional[str]] = mapped_column(Text)
    note: Mapped[Optional[str]] = mapped_column(Text)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Optional metadata blobs
    config_json: Mapped[Optional[dict]] = mapped_column("config_json", JSON)
    source_meta_json: Mapped[Optional[dict]] = mapped_column("source_meta_json", JSON)


class Subzone(Base):
    __tablename__ = "subzones"

    snapshot_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("snapshots.id", ondelete="CASCADE"), nullable=False)
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


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("role IN ('admin','user')", name="users_role_check"),
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


