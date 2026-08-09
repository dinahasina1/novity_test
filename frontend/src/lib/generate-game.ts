import type { GeneratedGame } from "./types";
import { optionsForExtensionSlot } from "./frame-editor";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pinsToken(pins: number): string {
  return pins === 0 ? "-" : String(pins);
}

function isStrike(frame: string[]): boolean {
  return frame.length === 1 && frame[0] === "X";
}

function isSpare(frame: string[]): boolean {
  return frame.includes("/");
}

/** Generate one valid 15-pin frame. */
export function generateFrame(): string[] {
  const roll = Math.random();

  if (roll < 0.28) {
    return ["X"];
  }

  if (roll < 0.55) {
    const first = randomInt(0, 14);
    return [pinsToken(first), "/"];
  }

  if (roll < 0.7) {
    const first = randomInt(0, 12);
    const secondMax = Math.max(0, 14 - first);
    const second = randomInt(0, secondMax);
    if (first + second >= 15) {
      return [pinsToken(first), "/"];
    }
    return [pinsToken(first), pinsToken(second), "/"];
  }

  // Open frame: always 3 throws when first two don't clear 15
  const first = randomInt(0, 14);
  const secondMax = Math.max(0, 14 - first);
  let second = randomInt(0, secondMax);
  if (first + second >= 15) {
    // Force open: reduce second so a third throw is required
    second = Math.max(0, 14 - first);
    if (first + second >= 15) {
      second = Math.max(0, 13 - first);
    }
  }
  const thirdMax = Math.max(0, 14 - first - second);
  const third = randomInt(0, thirdMax);
  return [pinsToken(first), pinsToken(second), pinsToken(third)];
}

export function missingBonusThrows(frames: string[][]): number {
  const allThrows = frames.flat();
  let throwIndex = 0;
  let needed = 0;

  for (const frame of frames) {
    const count = frame.length;
    if (isStrike(frame)) {
      const available = allThrows.length - (throwIndex + 1);
      needed = Math.max(needed, 3 - available);
    } else if (isSpare(frame)) {
      const available = allThrows.length - (throwIndex + count);
      needed = Math.max(needed, 2 - available);
    }
    throwIndex += count;
  }

  return Math.max(0, needed);
}

/**
 * Fill bonus throws with the same frame rules as F1ÔÇôF5:
 * e.g. 6/ then X ÔÇö never 6 X X in one group.
 */
export function fillExtensions(
  needed: number,
  current: string[] = [],
  fillRandom = true,
): string[] {
  if (needed <= 0) return [];
  const next: string[] = [];
  for (const token of current.slice(0, needed)) {
    const allowed = optionsForExtensionSlot(next, next.length);
    if (!token || !allowed.includes(token)) break;
    next.push(token);
  }
  while (next.length < needed) {
    if (!fillRandom) {
      next.push("");
      continue;
    }
    // Prefer generating whole frames, then take throws until needed.
    const frame = generateFrame();
    for (const token of frame) {
      if (next.length >= needed) break;
      const allowed = optionsForExtensionSlot(next, next.length).filter(Boolean);
      if (!allowed.includes(token)) {
        // Fallback: pick any legal option for this slot
        if (allowed.length === 0) break;
        next.push(allowed[randomInt(0, allowed.length - 1)]);
      } else {
        next.push(token);
      }
    }
  }
  return next.slice(0, needed);
}

export function buildGame(
  frames: string[][],
  currentExtensions: string[] = [],
  fillRandom = true,
): GeneratedGame {
  const count = missingBonusThrows(frames);
  return {
    frames,
    extensions: fillExtensions(count, currentExtensions, fillRandom),
  };
}

/** @deprecated use buildGame */
export function withRequiredExtensions(
  frames: string[][],
  currentExtensions: string[] = [],
): GeneratedGame {
  return buildGame(frames, currentExtensions);
}

export function generateRandomGame(): GeneratedGame {
  const frames = Array.from({ length: 5 }, () => generateFrame());
  return buildGame(frames);
}

export function generateRandomGames(count: number): GeneratedGame[] {
  return Array.from({ length: count }, () => generateRandomGame());
}
