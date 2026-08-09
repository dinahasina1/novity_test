from __future__ import annotations

import json

import strawberry
from pydantic import ValidationError
from sqlalchemy.orm import Session
from strawberry.exceptions import GraphQLError

from app.db.database import SessionLocal
from app.db.repository import get_score, list_scores, save_game
from app.graphql.types import FrameScoreType, GameScoreType, ThrowType
from app.scoring.calculator import ScoreResult, calculate
from app.scoring.game import Game


def _db() -> Session:
    return SessionLocal()


def _extension_values(game_row) -> list[str]:
    return [
        throw.value
        for throw in sorted(game_row.throws, key=lambda item: item.index)
        if throw.frame_id is None
    ]


def _to_game_score(
    game_id: str,
    session_id: str,
    result: ScoreResult,
    extensions: list[str],
) -> GameScoreType:
    return GameScoreType(
        game_id=strawberry.ID(game_id),
        session_id=strawberry.ID(session_id),
        total=result.total,
        frames=[
            FrameScoreType(
                index=frame.index,
                score=frame.score,
                throws=[ThrowType(value=throw.value) for throw in frame.throws],
            )
            for frame in result.frames
        ],
        extensions=extensions,
    )


def _from_stored_score(score_row) -> GameScoreType:
    payload = json.loads(score_row.frame_scores)
    return GameScoreType(
        game_id=strawberry.ID(score_row.game_id),
        session_id=strawberry.ID(score_row.game.session_id),
        total=score_row.total,
        frames=[
            FrameScoreType(
                index=frame["index"],
                score=frame["score"],
                throws=[ThrowType(value=throw["value"]) for throw in frame["throws"]],
            )
            for frame in payload
        ],
        extensions=_extension_values(score_row.game),
    )


@strawberry.type
class Query:
    @strawberry.field
    def games(self) -> list[GameScoreType]:
        db = _db()
        try:
            return [_from_stored_score(score) for score in list_scores(db)]
        finally:
            db.close()

    @strawberry.field
    def game_score(self, game_id: strawberry.ID) -> GameScoreType | None:
        db = _db()
        try:
            score = get_score(db, str(game_id))
            if score is None:
                return None
            return _from_stored_score(score)
        finally:
            db.close()


@strawberry.type
class Mutation:
    @strawberry.mutation
    def score_game(
        self,
        frames: list[list[str]],
        extensions: list[str] | None = None,
        session_id: strawberry.ID | None = None,
    ) -> GameScoreType:
        extension_tokens = extensions or []
        try:
            game = Game.from_tokens(frames=frames, extensions=extension_tokens)
            result = calculate(game)
        except (ValidationError, ValueError) as exc:
            raise GraphQLError(str(exc)) from exc

        db = _db()
        try:
            saved = save_game(
                db,
                domain_game=game,
                score_result=result,
                session_id=str(session_id) if session_id is not None else None,
            )
            return _to_game_score(
                saved.id,
                saved.session_id,
                result,
                extension_tokens,
            )
        finally:
            db.close()


schema = strawberry.Schema(query=Query, mutation=Mutation)
