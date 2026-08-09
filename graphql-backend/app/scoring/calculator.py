from __future__ import annotations

from pydantic import BaseModel

from app.scoring.extensions import extension_pin_sequence
from app.scoring.game import Game


class ThrowScore(BaseModel):
    value: str
    pins: int


class FrameScore(BaseModel):
    index: int
    score: int
    throws: list[ThrowScore]


class ScoreResult(BaseModel):
    total: int
    frames: list[FrameScore]


def calculate(game: Game) -> ScoreResult:
    all_pins = _chronological_pins(game)
    frame_scores: list[FrameScore] = []
    throw_index = 0

    for frame_index, frame in enumerate(game.frames):
        frame_throw_count = len(frame.throws)
        frame_pins = all_pins[throw_index : throw_index + frame_throw_count]
        base = sum(frame_pins)

        if frame.is_strike:
            bonus_pins = all_pins[throw_index + 1 : throw_index + 4]
            if len(bonus_pins) < 3:
                raise ValueError(f"missing bonus throws for strike at frame {frame_index + 1}")
            score = base + sum(bonus_pins)
        elif frame.is_spare:
            bonus_start = throw_index + frame_throw_count
            bonus_pins = all_pins[bonus_start : bonus_start + 2]
            if len(bonus_pins) < 2:
                raise ValueError(f"missing bonus throws for spare at frame {frame_index + 1}")
            score = base + sum(bonus_pins)
        else:
            score = base

        frame_scores.append(
            FrameScore(
                index=frame_index,
                score=score,
                throws=[
                    ThrowScore(value=throw.value, pins=pins)
                    for throw, pins in zip(frame.throws, frame_pins, strict=True)
                ],
            )
        )
        throw_index += frame_throw_count

    return ScoreResult(total=sum(frame.score for frame in frame_scores), frames=frame_scores)


def _chronological_pins(game: Game) -> list[int]:
    pins: list[int] = []
    for frame in game.frames:
        pins.extend(frame.pin_sequence())
    pins.extend(extension_pin_sequence(game.extensions))
    return pins
