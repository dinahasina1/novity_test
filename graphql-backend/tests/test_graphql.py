SCORE_GAME = """
mutation ScoreGame($frames: [[String!]!]!, $extensions: [String!], $sessionId: ID) {
  scoreGame(frames: $frames, extensions: $extensions, sessionId: $sessionId) {
    gameId
    sessionId
    total
    extensions
    frames {
      index
      score
      throws { value }
    }
  }
}
"""

GAME_SCORE = """
query GameScore($gameId: ID!) {
  gameScore(gameId: $gameId) {
    gameId
    total
    extensions
    frames { index score throws { value } }
  }
}
"""

GAMES = """
query Games {
  games {
    gameId
    total
    extensions
    frames {
      index
      score
      throws { value }
    }
  }
}
"""


def test_score_game_all_strikes(client):
    response = client.post(
        "/graphql",
        json={
            "query": SCORE_GAME,
            "variables": {
                "frames": [["X"], ["X"], ["X"], ["X"], ["X"]],
                "extensions": ["X", "X", "X"],
            },
        },
    )
    assert response.status_code == 200
    payload = response.json()["data"]["scoreGame"]
    assert payload["total"] == 300
    assert [frame["score"] for frame in payload["frames"]] == [60, 60, 60, 60, 60]
    assert payload["extensions"] == ["X", "X", "X"]
    assert payload["gameId"]
    assert payload["sessionId"]


def test_score_game_mixed_and_read_back(client):
    response = client.post(
        "/graphql",
        json={
            "query": SCORE_GAME,
            "variables": {
                "frames": [
                    ["6", "/"],
                    ["12", "-", "1"],
                    ["-", "-", "/"],
                    ["14", "-", "-"],
                    ["X"],
                ],
                "extensions": ["-", "-", "/"],
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "errors" not in body
    scored = body["data"]["scoreGame"]
    assert scored["total"] == 113
    assert [frame["score"] for frame in scored["frames"]] == [27, 13, 29, 14, 30]

    read = client.post(
        "/graphql",
        json={"query": GAME_SCORE, "variables": {"gameId": scored["gameId"]}},
    )
    assert read.status_code == 200
    stored = read.json()["data"]["gameScore"]
    assert stored["total"] == 113
    assert stored["gameId"] == scored["gameId"]
    assert stored["extensions"] == ["-", "-", "/"]


def test_games_lists_scored_games(client):
    client.post(
        "/graphql",
        json={
            "query": SCORE_GAME,
            "variables": {
                "frames": [["X"], ["X"], ["X"], ["X"], ["X"]],
                "extensions": ["X", "X", "X"],
            },
        },
    )
    client.post(
        "/graphql",
        json={
            "query": SCORE_GAME,
            "variables": {
                "frames": [
                    ["6", "/"],
                    ["12", "-", "1"],
                    ["-", "-", "/"],
                    ["14", "-", "-"],
                    ["X"],
                ],
                "extensions": ["-", "-", "/"],
            },
        },
    )

    response = client.post("/graphql", json={"query": GAMES})
    assert response.status_code == 200
    games = response.json()["data"]["games"]
    assert len(games) >= 2
    totals = [game["total"] for game in games[:2]]
    assert totals[0] == 113
    assert 300 in [game["total"] for game in games]
    perfect = next(game for game in games if game["total"] == 300)
    assert perfect["extensions"] == ["X", "X", "X"]
