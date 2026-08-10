"use client";

import { generateFrame, missingBonusThrows } from "../lib/generate-game";
import {
  bonusThrowSlots,
  emptyGameFrames,
  isBonusGroupBoundary,
  normalizeFrame,
  optionsForExtensionSlot,
  optionsForSlot,
  padFrameSlots,
  runningPins,
} from "../lib/frame-editor";
import type { GameTableRow } from "../lib/types";
import { GamesTable } from "./GamesTable";

type Props = {
  frames: string[][];
  extensions: string[];
  total: number | null;
  pending: boolean;
  loading: boolean;
  error: string | null;
  tableRows: GameTableRow[];
  onFramesChange: (frames: string[][]) => void;
  onExtensionsChange: (extensions: string[]) => void;
  onRandomOne: () => void;
  onRandomTen: () => void;
  onScore: () => void;
  onReset: () => void;
};

function ThrowSelect({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-12 rounded border border-line bg-white px-0.5 text-center font-mono text-xs disabled:bg-zinc-100 disabled:text-muted"
    >
      {options.map((option) => (
        <option key={option || "empty"} value={option}>
          {option === "" ? "—" : option}
        </option>
      ))}
    </select>
  );
}

export function GameEditor({
  frames,
  extensions,
  total,
  pending,
  loading,
  error,
  tableRows,
  onFramesChange,
  onExtensionsChange,
  onRandomOne,
  onRandomTen,
  onScore,
  onReset,
}: Props) {
  const normalized = frames.map((frame) => normalizeFrame(frame));
  const needed = missingBonusThrows(normalized);
  const bonusSlots = bonusThrowSlots(extensions, needed);

  function updateBonusThrow(index: number, value: string) {
    const next = Array.from({ length: needed }, (_, i) => {
      if (i < index) return bonusSlots[i] ?? "";
      if (i === index) return value;
      return "";
    });
    onExtensionsChange(next);
  }

  function updateThrow(frameIndex: number, slotIndex: number, value: string) {
    const next = frames.map((frame, i) => {
      if (i !== frameIndex) return frame;
      if (value === "X") return ["X"];
      const slots = padFrameSlots(frame);
      if (value === "") return slots.slice(0, slotIndex);
      slots[slotIndex] = value;
      for (let s = slotIndex + 1; s < 3; s += 1) slots[s] = "";
      const filled = slots.slice(0, slotIndex + 1);
      // Keep three slots available in state when open (2 throws < 15)
      if (
        filled[0] !== "X" &&
        !filled.includes("/") &&
        !(filled.length >= 2 && runningPins(filled) >= 15)
      ) {
        return padFrameSlots(filled);
      }
      return filled.filter(Boolean);
    });
    onFramesChange(next);
  }

  function randomizeFrame(frameIndex: number) {
    onFramesChange(
      frames.map((frame, i) => (i === frameIndex ? generateFrame() : frame)),
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-surface p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Partie
          </h2>
          {total != null ? (
            <p className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              {total}
            </p>
          ) : null}
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRandomOne}
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            Aléatoire
          </button>
          <button
            type="button"
            onClick={onRandomTen}
            disabled={pending}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40"
          >
            10 aléatoires
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs hover:bg-zinc-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onScore}
            disabled={pending}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-40"
          >
            {pending ? "Envoi…" : "Scorer"}
          </button>
        </div>

        <div className="flex flex-wrap items-stretch gap-2">
          {(frames.length ? frames : emptyGameFrames()).map((frame, frameIndex) => {
            const slots = padFrameSlots(frame);
            return (
              <div
                key={frameIndex}
                className="rounded-md border border-line px-2 py-1.5"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                    F{frameIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => randomizeFrame(frameIndex)}
                    className="text-[10px] text-sky-700 hover:underline"
                  >
                    rnd
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {slots.map((token, slotIndex) => {
                    const options = optionsForSlot(slots, slotIndex);
                    const disabled = options.length <= 1 && options[0] === "";
                    return (
                      <ThrowSelect
                        key={slotIndex}
                        value={token}
                        options={options}
                        disabled={disabled}
                        onChange={(v) => updateThrow(frameIndex, slotIndex, v)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {needed > 0 ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                Bonus ({needed} throw{needed > 1 ? "s" : ""})
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {bonusSlots.map((token, index) => (
                  <div key={`bonus-${index}`} className="flex items-center gap-1">
                    {isBonusGroupBoundary(bonusSlots, index) ? (
                      <span
                        className="mx-0.5 text-[10px] font-medium text-amber-700"
                        title="Nouveau cadre bonus"
                      >
                        |
                      </span>
                    ) : null}
                    <ThrowSelect
                      value={token}
                      options={optionsForExtensionSlot(bonusSlots, index)}
                      onChange={(v) => updateBonusThrow(index, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-line bg-surface p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Tableau des jeux
          </h3>
          {loading || pending ? (
            <span className="text-xs text-muted">
              {loading ? "Chargement…" : "Calcul des scores…"}
            </span>
          ) : null}
        </div>
        <GamesTable rows={tableRows} loading={loading} />
      </section>
    </div>
  );
}
