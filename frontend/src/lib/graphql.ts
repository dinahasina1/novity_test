import type { GameScore, GameTableRow, GeneratedGame } from "./types";

const DEFAULT_URL = "http://localhost:8000/graphql";

function graphqlUrl(): string {
  return process.env.NEXT_PUBLIC_GRAPHQL_URL ?? DEFAULT_URL;
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(graphqlUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}`);
  }

  const body = (await response.json()) as GraphQLResponse<T>;
  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join("; "));
  }
  if (!body.data) {
    throw new Error("Empty GraphQL response");
  }
  return body.data;
}

const GAME_FIELDS = `
  gameId
  sessionId
  total
  extensions
  frames {
    index
    score
    throws { value }
  }
`;

const SCORE_GAME = `
mutation ScoreGame($frames: [[String!]!]!, $extensions: [String!]) {
  scoreGame(frames: $frames, extensions: $extensions) {
    ${GAME_FIELDS}
  }
}
`;

const GAMES = `
query Games {
  games {
    ${GAME_FIELDS}
  }
}
`;

export function gameScoreToTableRow(
  game: GameScore,
  label?: string,
): GameTableRow {
  return {
    gameId: game.gameId,
    total: game.total,
    extensions: game.extensions ?? [],
    frames: game.frames.map((frame) =>
      frame.throws.map((throwItem) => throwItem.value),
    ),
    frameScores: game.frames.map((frame) => frame.score),
    label,
  };
}

export async function scoreGame(game: GeneratedGame): Promise<GameScore> {
  const data = await gql<{ scoreGame: GameScore }>(SCORE_GAME, {
    frames: game.frames,
    extensions: game.extensions,
  });
  return data.scoreGame;
}

export async function fetchGames(): Promise<GameScore[]> {
  const data = await gql<{ games: GameScore[] }>(GAMES);
  return data.games;
}
