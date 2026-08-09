import pytest
from pydantic import ValidationError

from app.scoring.calculator import calculate
from app.scoring.frame import Frame
from app.scoring.game import Game
from app.scoring.throw import Throw


def test_throw_tokens():
    assert Throw(value="X").pins() == 15
    assert Throw(value="-").pins() == 0
    assert Throw(value="12").pins() == 12
    assert Throw(value="/").pins(6) == 9


def test_invalid_throw():
    with pytest.raises(ValidationError):
        Throw(value="15")
    with pytest.raises(ValidationError):
        Throw(value="Y")


def test_frame_kinds():
    assert Frame.from_tokens(["X"]).is_strike
    assert Frame.from_tokens(["6", "/"]).is_spare
    assert Frame.from_tokens(["12", "-", "1"]).is_open


def test_invalid_frame_after_strike():
    with pytest.raises(ValidationError):
        Frame.from_tokens(["X", "-"])


def test_all_strikes_score_300():
    game = Game.from_tokens(
        frames=[["X"], ["X"], ["X"], ["X"], ["X"]],
        extensions=["X", "X", "X"],
    )
    result = calculate(game)
    assert result.total == 300
    assert [frame.score for frame in result.frames] == [60, 60, 60, 60, 60]


def test_mixed_game_scores():
    game = Game.from_tokens(
        frames=[
            ["6", "/"],
            ["12", "-", "1"],
            ["-", "-", "/"],
            ["14", "-", "-"],
            ["X"],
        ],
        extensions=["-", "-", "/"],
    )
    result = calculate(game)
    assert [frame.score for frame in result.frames] == [27, 13, 29, 14, 30]
    assert result.total == 113


def test_bonus_follows_frame_rules_reject_6xx():
    with pytest.raises(ValidationError):
        Game.from_tokens(
            frames=[["X"], ["X"], ["X"], ["X"], ["X"]],
            extensions=["6", "X", "X"],
        )


def test_bonus_spare_then_strike_frame():
    game = Game.from_tokens(
        frames=[["X"], ["X"], ["X"], ["X"], ["X"]],
        extensions=["6", "/", "X"],
    )
    result = calculate(game)
    assert [frame.score for frame in result.frames] == [60, 60, 51, 45, 45]
    assert result.total == 261


def test_bonus_open_three_throws():
    game = Game.from_tokens(
        frames=[["X"], ["X"], ["X"], ["X"], ["X"]],
        extensions=["-", "-", "/"],
    )
    result = calculate(game)
    assert [frame.score for frame in result.frames] == [60, 60, 45, 30, 30]
    assert result.total == 225

