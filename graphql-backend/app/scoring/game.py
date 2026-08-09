from __future__ import annotations

from pydantic import BaseModel, model_validator

from app.scoring.extensions import InvalidExtensionsError, group_extension_throws
from app.scoring.frame import Frame
from app.scoring.throw import Throw


class InvalidGameError(ValueError):
    pass


class Game(BaseModel):
    frames: list[Frame]
    extensions: list[Throw] = []

    @model_validator(mode="after")
    def validate_game(self) -> Game:
        if len(self.frames) != 5:
            raise InvalidGameError("game requires exactly 5 frames")
        try:
            group_extension_throws(self.extensions)
        except InvalidExtensionsError as exc:
            raise InvalidGameError(str(exc)) from exc
        return self

    @classmethod
    def from_tokens(
        cls,
        frames: list[list[str]],
        extensions: list[str] | None = None,
    ) -> Game:
        return cls(
            frames=[Frame.from_tokens(frame) for frame in frames],
            extensions=[Throw(value=token) for token in (extensions or [])],
        )

    def chronological_throws(self) -> list[Throw]:
        throws: list[Throw] = []
        for frame in self.frames:
            throws.extend(frame.throws)
        throws.extend(self.extensions)
        return throws
