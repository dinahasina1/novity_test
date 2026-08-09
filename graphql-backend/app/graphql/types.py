from __future__ import annotations

import strawberry


@strawberry.type
class ThrowType:
    value: str
    pins: int


@strawberry.type
class FrameScoreType:
    index: int
    score: int
    throws: list[ThrowType]


@strawberry.type
class GameScoreType:
    game_id: strawberry.ID
    session_id: strawberry.ID
    total: int
    frames: list[FrameScoreType]
