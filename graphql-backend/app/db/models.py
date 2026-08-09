from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_id() -> str:
    return str(uuid.uuid4())


class BowlingSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    games: Mapped[list[Game]] = relationship(back_populates="session")


class Game(Base):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    session: Mapped[BowlingSession] = relationship(back_populates="games")
    frames: Mapped[list[Frame]] = relationship(
        back_populates="game",
        cascade="all, delete-orphan",
        order_by="Frame.index",
    )
    throws: Mapped[list[Throw]] = relationship(
        back_populates="game",
        cascade="all, delete-orphan",
        order_by="Throw.index",
    )
    score: Mapped[Score | None] = relationship(
        back_populates="game",
        cascade="all, delete-orphan",
        uselist=False,
    )


class Frame(Base):
    __tablename__ = "frames"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    game_id: Mapped[str] = mapped_column(ForeignKey("games.id"), nullable=False)
    index: Mapped[int] = mapped_column(Integer, nullable=False)

    game: Mapped[Game] = relationship(back_populates="frames")
    throws: Mapped[list[Throw]] = relationship(
        back_populates="frame",
        cascade="all, delete-orphan",
        order_by="Throw.index",
        foreign_keys="Throw.frame_id",
    )


class Throw(Base):
    __tablename__ = "throws"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    game_id: Mapped[str] = mapped_column(ForeignKey("games.id"), nullable=False)
    frame_id: Mapped[str | None] = mapped_column(ForeignKey("frames.id"), nullable=True)
    index: Mapped[int] = mapped_column(Integer, nullable=False)
    value: Mapped[str] = mapped_column(String(3), nullable=False)
    pins: Mapped[int] = mapped_column(Integer, nullable=False)

    game: Mapped[Game] = relationship(back_populates="throws", foreign_keys=[game_id])
    frame: Mapped[Frame | None] = relationship(
        back_populates="throws",
        foreign_keys=[frame_id],
    )


class Score(Base):
    __tablename__ = "scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    game_id: Mapped[str] = mapped_column(ForeignKey("games.id"), unique=True, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    frame_scores: Mapped[str] = mapped_column(Text, nullable=False)

    game: Mapped[Game] = relationship(back_populates="score")
