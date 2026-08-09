/** Helpers for editable 15-pin frames (tokens: X, /, -, 1-14). */

export function tokenPins(token: string, previous = 0): number {
  if (!token) return 0;
  if (token === "X") return 15;
  if (token === "/") return 15 - previous;
  if (token === "-") return 0;
  const n = Number(token);
  return Number.isFinite(n) ? n : 0;
}

export function runningPins(tokens: string[]): number {
  let running = 0;
  for (const token of tokens) {
    if (!token) continue;
    running += tokenPins(token, running);
  }
  return running;
}

/**
 * Frame / bonus-group complete?
 * - X ÔåÆ 1 throw
 * - spare (/) ÔåÆ 2+ throws ending with /
 * - two throws totaling 15 ÔåÆ complete
 * - otherwise need 3 throws if first two did not clear 15
 */
export function isThrowGroupComplete(tokens: string[]): boolean {
  const filled = tokens.filter(Boolean);
  if (filled.length === 0) return false;
  if (filled[0] === "X") return true;
  if (filled.includes("/")) return true;
  if (filled.length >= 3) return true;
  if (filled.length === 2 && runningPins(filled) >= 15) return true;
  return false;
}

export function maxPinsForSlot(tokens: string[], slotIndex: number): number {
  const previous = tokens.slice(0, slotIndex).filter(Boolean);
  if (previous[0] === "X") return 0;
  if (previous.includes("/")) return 0;
  if (previous.length >= 2 && runningPins(previous) >= 15) return 0;
  const used = runningPins(previous);
  return Math.max(0, 15 - used);
}

export function optionsForSlot(tokens: string[], slotIndex: number): string[] {
  if (slotIndex > 0) {
    const prev = tokens.slice(0, slotIndex).filter(Boolean);
    if (prev[0] === "X") return [""];
    if (prev.includes("/")) return [""];
    // Two throws already cleared 15 ÔåÆ no third throw
    if (prev.length >= 2 && runningPins(prev) >= 15) return [""];
    // One or two throws under 15 ÔåÆ keep going (third throw if needed)
  }

  if (slotIndex === 0) {
    return ["", "X", "-", ...Array.from({ length: 14 }, (_, i) => String(i + 1))];
  }

  const max = maxPinsForSlot(tokens, slotIndex);
  if (max <= 0) return [""];

  const options = ["", "/", "-"];
  for (let n = 1; n <= Math.min(14, max); n += 1) {
    options.push(String(n));
  }
  // Spare only when this throw can finish the frame (exact remaining)
  // "/" already added; numeric max is remaining pins
  return options;
}

export function normalizeFrame(tokens: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    const token = tokens[i] ?? "";
    if (!token) break;
    const allowed = optionsForSlot(result, result.length);
    if (!allowed.includes(token)) break;
    result.push(token);
    if (isThrowGroupComplete(result)) break;
  }
  return result.length > 0 ? result : ["-"];
}

export function emptyGameFrames(): string[][] {
  return Array.from({ length: 5 }, () => ["", ""]);
}

export function padFrameSlots(frame: string[]): string[] {
  const slots = [...frame];
  while (slots.length < 3) slots.push("");
  return slots.slice(0, 3);
}

/**
 * Current bonus throw-group (frame) containing flat `index`.
 * After strike/spare/clear ÔåÆ reframe (new group, full pins).
 */
export function currentBonusGroup(
  extensions: string[],
  index: number,
): { tokens: string[]; slotIndex: number } {
  const previous = extensions.slice(0, index).filter(Boolean);
  let cursor = 0;
  while (cursor < previous.length) {
    const group: string[] = [];
    while (cursor < previous.length) {
      group.push(previous[cursor]);
      cursor += 1;
      if (isThrowGroupComplete(group)) break;
    }
    if (!isThrowGroupComplete(group) && cursor >= previous.length) {
      return { tokens: group, slotIndex: group.length };
    }
  }
  return { tokens: [], slotIndex: 0 };
}

/** Same options as a normal frame slot ÔÇö never allow 6 then X in the same group. */
export function optionsForExtensionSlot(
  extensions: string[],
  index: number,
): string[] {
  const { tokens, slotIndex } = currentBonusGroup(extensions, index);
  return optionsForSlot(padFrameSlots(tokens), slotIndex);
}

/** True when `index` starts a new bonus frame (after previous group completed). */
export function isBonusGroupBoundary(
  extensions: string[],
  index: number,
): boolean {
  if (index <= 0) return false;
  const previous = extensions.slice(0, index).filter(Boolean);
  if (previous.length === 0) return false;
  let cursor = 0;
  while (cursor < previous.length) {
    const group: string[] = [];
    while (cursor < previous.length) {
      group.push(previous[cursor]);
      cursor += 1;
      if (isThrowGroupComplete(group)) break;
    }
    if (isThrowGroupComplete(group) && cursor === previous.length) {
      return true;
    }
  }
  return false;
}

/**
 * Bonus UI: flat list of exactly `neededThrows` slots, but each slot
 * follows frame rules (reframe when pins are cleared).
 */
export function bonusThrowSlots(
  extensions: string[],
  neededThrows: number,
): string[] {
  if (neededThrows <= 0) return [];
  const slots: string[] = [];
  for (const token of extensions.slice(0, neededThrows)) {
    const allowed = optionsForExtensionSlot(slots, slots.length);
    if (!token || !allowed.includes(token)) break;
    slots.push(token);
  }
  while (slots.length < neededThrows) slots.push("");
  return slots.slice(0, neededThrows);
}
export function formatThrows(throws: string[]): string {
  const filled = throws.filter(Boolean);
  if (filled.length === 0) return "ÔÇö";
  return filled.join(" ");
}

/** Max rows shown per table page; more rows go to following pages. */
export const TABLE_PAGE_SIZE = 50;

export function appendTableRows<T>(prev: T[], next: T[]): T[] {
  return [...prev, ...next];
}
