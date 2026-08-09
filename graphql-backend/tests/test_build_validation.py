"""Smoke tests used as build gate (TDD-style validation before image publish)."""

from fastapi.testclient import TestClient

from app.main import create_app
from app.scoring.calculator import calculate
from app.scoring.game import Game


def test_app_boots_and_exposes_graphql():
    app = create_app()
    client = TestClient(app)

    response = client.get("/graphql")

    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")


def test_scoring_contract_for_release():
    """Minimal scoring assertion that must stay green to publish an image."""
    game = Game.from_tokens(
        frames=[["X"], ["X"], ["X"], ["X"], ["X"]],
        extensions=["X", "X", "X"],
    )

    assert calculate(game).total == 300
