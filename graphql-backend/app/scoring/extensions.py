from __future__ import annotations

from pydantic import ValidationError

from app.scoring.frame import Frame, InvalidFrameError
from app.scoring.throw import InvalidThrowError, Throw


class InvalidExtensionsError(ValueError):
    pass


def group_extension_throws(throws: list[Throw]) -> list[list[Throw]]:
    """
    Split bonus throws into frame-like groups.

    Same rules as normal frames: strike ÔåÆ new group next; spare/clear ÔåÆ reframe;
    pins remaining ÔåÆ keep throwing in the current group (max 3).
    """
    groups: list[list[Throw]] = []
    index = 0
    while index < len(throws):
        group: list[Throw] = []
        while index < len(throws) and len(group) < 3:
            candidate = [*group, throws[index]]
            try:
                frame = Frame(throws=candidate)
            except (ValidationError, InvalidFrameError, InvalidThrowError) as exc:
                raise InvalidExtensionsError(
                    "bonus throws must follow frame rules "
                    f"(invalid at throw {index + 1}: {[t.value for t in candidate]})"
                ) from exc

            group = candidate
            index += 1
            if (
                frame.is_strike
                or frame.is_spare
                or len(group) == 3
                or frame.pin_total() >= 15
            ):
                break
        groups.append(group)
    return groups


def extension_pin_sequence(throws: list[Throw]) -> list[int]:
    pins: list[int] = []
    for group in group_extension_throws(throws):
        pins.extend(Frame(throws=group).pin_sequence())
    return pins
