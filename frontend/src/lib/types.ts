export type ThrowScore = {
  value: string;
};

export type FrameScore = {
  index: number;
  score: number;
  throws: ThrowScore[];
};

export type GameScore = {
  gameId: string;
  sessionId: string;
  total: number;
  frames: FrameScore[];
  extensions: string[];
};

export type GeneratedGame = {
  frames: string[][];
  extensions: string[];
};

export type GameTableRow = GeneratedGame & {
  total: number | null;
  gameId?: string;
  label?: string;
  frameScores: number[];
};
