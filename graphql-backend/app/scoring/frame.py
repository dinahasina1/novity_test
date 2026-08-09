from __future__ import annotations

from pydantic import BaseModel, model_validator

from app.scoring.throw import InvalidThrowError, Throw


class InvalidFrameError(ValueError):
    pass


class Frame(BaseModel):
    throws: list[Throw]

    @model_validator(mode="after")
    def validate_frame(self) -> Frame:
        if not self.throws:
            raise InvalidFrameError("frame requires at least one throw")
        if len(self.throws) > 3:
            raise InvalidFrameError("frame accepts at most 3 throws")
        if self.throws[0].is_strike and len(self.throws) != 1:
            raise InvalidFrameError("strike frame must contain a single throw")
        if self.throws[0].is_spare:
            raise InvalidFrameError("spare cannot be the first throw")

        running = 0
        for index, throw in enumerate(self.throws):
            pins = throw.pins(running)
            if throw.is_spare and index == 0:
                raise InvalidFrameError("spare cannot be the first throw")
            running += pins
            if running > 15:
                raise InvalidFrameError("frame pins exceed 15")
            if throw.is_spare and running != 15:
                raise InvalidThrowError("spare must bring frame to 15 pins")
            if running == 15 and index < len(self.throws) - 1 and not throw.is_strike:
                raise InvalidFrameError("no throws allowed after frame is complete")
        return self

    @classmethod
    def from_tokens(cls, tokens: list[str]) -> Frame:
        return cls(throws=[Throw(value=token) for token in tokens])

    @property
    def is_strike(self) -> bool:
        return len(self.throws) == 1 and self.throws[0].is_strike

    @property
    def is_spare(self) -> bool:
        return any(throw.is_spare for throw in self.throws)

    @property
    def is_open(self) -> bool:
        return not self.is_strike and not self.is_spare

    def pin_sequence(self) -> list[int]:
        pins: list[int] = []
        running = 0
        for throw in self.throws:
            value = throw.pins(running)
            pins.append(value)
            running += value
        return pins

    def pin_total(self) -> int:
        return sum(self.pin_sequence())
