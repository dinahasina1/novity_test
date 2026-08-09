"use client";

import { Fragment, useMemo, useState } from "react";
import { TABLE_PAGE_SIZE, formatThrows, padFrameSlots } from "../lib/frame-editor";
import type { GameTableRow } from "../lib/types";

export type { GameTableRow };

type Props = {
  rows: GameTableRow[];
  pageSize?: number;
  loading?: boolean;
};

export function GamesTable({
  rows,
  pageSize = TABLE_PAGE_SIZE,
  loading = false,
}: Props) {
  const [page, setPage] = useState(0);

  const maxBonusThrows = useMemo(
    () => Math.max(0, ...rows.map((row) => row.extensions.length)),
    [rows],
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize) || 1);
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const slice = rows.slice(start, start + pageSize);

  if (loading && rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
        Chargement des gamesÔÇª
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
        Aucune game. Score une partie pour la voir ici.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[880px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-line bg-zinc-50 text-[10px] uppercase tracking-wide text-muted">
              <th className="px-2 py-2 font-medium">#</th>
              {[1, 2, 3, 4, 5].map((n) => (
                <th
                  key={n}
                  colSpan={2}
                  className="border-l border-line px-2 py-2 text-center font-medium"
                >
                  F{n}
                </th>
              ))}
              {Array.from({ length: maxBonusThrows }, (_, i) => (
                <th
                  key={`b-${i}`}
                  className="border-l border-line px-2 py-2 font-medium text-amber-700"
                >
                  B{i + 1}
                </th>
              ))}
              <th className="border-l border-line px-2 py-2 text-right font-medium">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {slice.map((row, index) => {
              const absoluteIndex = start + index;
              return (
                <tr
                  key={row.gameId ?? `row-${absoluteIndex}`}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-2 py-2 font-medium text-muted">
                    {row.label ?? absoluteIndex + 1}
                  </td>
                  {Array.from({ length: 5 }, (_, fi) => (
                    <Fragment key={`f-${fi}`}>
                      <td className="border-l border-line px-2 py-2 font-mono whitespace-nowrap">
                        {formatThrows(padFrameSlots(row.frames[fi] ?? []))}
                      </td>
                      <td className="w-12 min-w-12 border-l border-sky-100 bg-sky-50 px-2 py-2 text-right font-mono font-semibold tabular-nums text-sky-950">
                        {row.frameScores[fi] ?? "ÔÇö"}
                      </td>
                    </Fragment>
                  ))}
                  {Array.from({ length: maxBonusThrows }, (_, bi) => (
                    <td
                      key={`b-${bi}`}
                      className="border-l border-line px-2 py-2 font-mono text-amber-800"
                    >
                      {row.extensions[bi] ?? "ÔÇö"}
                    </td>
                  ))}
                  <td className="border-l border-line px-2 py-2 text-right font-mono text-sm font-semibold tabular-nums">
                    {row.total ?? "ÔÇö"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {rows.length} jeu{rows.length > 1 ? "x" : ""} ┬À plus r├®cent en premier ┬À
          page {safePage + 1}/{pageCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded border border-line px-2 py-1 hover:bg-zinc-50 disabled:opacity-40"
          >
            Pr├®c├®dent
          </button>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="rounded border border-line px-2 py-1 hover:bg-zinc-50 disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}
