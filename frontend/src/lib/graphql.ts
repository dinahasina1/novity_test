import type { GameScore, GameTableRow, GeneratedGame } from "./types";

function graphqlUrl(): string {
  const url = process.env.NEXT_PUBLIC_GRAPHQL_URL?.trim();
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_GRAPHQL_URL manquant. Définis-le dans .env.local (dev) ou les variables Vercel (prod).",
    );
  }
  return url;
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const url = graphqlUrl();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new Error(
      `Impossible de joindre l'API GraphQL (${url}). Vérifie NEXT_PUBLIC_GRAPHQL_URL, que l'API est joignable, et CORS_ORIGINS côté backend. (${detail})`,
    );
  }

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status} (${url})`);
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
