SCORE_GAME = """
mutation ScoreGame($frames: [[String!]!]!, $extensions: [String!]) {
  scoreGame(frames: $frames, extensions: $extensions) {
    gameId
    sessionId
    total
    frames {
      index
      score
      throws { value pins }
    }
  }
}
"""

GAME_SCORE = """
query GameScore($gameId: ID!) {
  gameScore(gameId: $gameId) {
    gameId
    total
    frames { index score }
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
