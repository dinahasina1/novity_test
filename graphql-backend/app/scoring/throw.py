from __future__ import annotations

from pydantic import BaseModel, field_validator


class InvalidThrowError(ValueError):
    pass


class Throw(BaseModel):
    value: str

    @field_validator("value")
    @classmethod
    def validate_token(cls, token: str) -> str:
        if token in {"X", "/", "-"}:
            return token
        if token.isdigit():
            pins = int(token)
            if 1 <= pins <= 14:
                return token
        raise InvalidThrowError(f"invalid throw token: {token!r}")

    @property
    def is_strike(self) -> bool:
        return self.value == "X"

    @property
    def is_spare(self) -> bool:
        return self.value == "/"

    @property
    def is_miss(self) -> bool:
        return self.value == "-"

    def pins(self, previous_pins: int = 0) -> int:
        if self.is_strike:
            return 15
        if self.is_spare:
            remaining = 15 - previous_pins
            if remaining <= 0 or remaining > 15:
                raise InvalidThrowError("spare cannot complete frame pins")
            return remaining
        if self.is_miss:
            return 0
        return int(self.value)
