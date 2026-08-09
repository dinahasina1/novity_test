from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.db import models
from app.scoring.calculator import ScoreResult
from app.scoring.game import Game as DomainGame
from app.scoring.throw import Throw as DomainThrow


def ensure_session(db: Session, session_id: str | None = None) -> models.BowlingSession:
    if session_id is not None:
        existing = db.get(models.BowlingSession, session_id)
        if existing is not None:
            return existing
    session = models.BowlingSession()
    db.add(session)
    db.flush()
    return session


def save_game(
    db: Session,
    domain_game: DomainGame,
    score_result: ScoreResult,
    session_id: str | None = None,
) -> models.Game:
    bowling_session = ensure_session(db, session_id)
    game = models.Game(session_id=bowling_session.id)
    db.add(game)
    db.flush()

    throw_index = 0
    for frame_index, domain_frame in enumerate(domain_game.frames):
        frame = models.Frame(game_id=game.id, index=frame_index)
        db.add(frame)
        db.flush()
        frame_score = score_result.frames[frame_index]
        for throw_offset, domain_throw in enumerate(domain_frame.throws):
            db.add(
                models.Throw(
                    game_id=game.id,
                    frame_id=frame.id,
                    index=throw_index,
                    value=domain_throw.value,
                    pins=frame_score.throws[throw_offset].pins,
                )
            )
            throw_index += 1

    for domain_throw, pins in zip(
        domain_game.extensions,
        _extension_pins(domain_game.extensions),
        strict=True,
    ):
        db.add(
            models.Throw(
                game_id=game.id,
                frame_id=None,
                index=throw_index,
                value=domain_throw.value,
                pins=pins,
            )
        )
        throw_index += 1

    db.add(
        models.Score(
            game_id=game.id,
            total=score_result.total,
            frame_scores=json.dumps(
                [
                    {
                        "index": frame.index,
                        "score": frame.score,
                        "throws": [
                            {"value": throw.value, "pins": throw.pins}
                            for throw in frame.throws
                        ],
                    }
                    for frame in score_result.frames
                ]
            ),
        )
    )
    db.commit()
    db.refresh(game)
    return game


def get_score(db: Session, game_id: str) -> models.Score | None:
    game = db.get(models.Game, game_id)
    if game is None or game.score is None:
        return None
    return game.score


def _extension_pins(throws: list[DomainThrow]) -> list[int]:
    pins: list[int] = []
    previous = 0
    for throw in throws:
        value = throw.pins(previous)
        pins.append(value)
        if throw.is_strike or throw.is_spare:
            previous = 0
        else:
            previous += value
            if previous >= 15:
                previous = 0
    return pins
