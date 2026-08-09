"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  emptyGameFrames,
  normalizeFrame,
} from "../lib/frame-editor";
import {
  buildGame,
  generateRandomGame,
  generateRandomGames,
} from "../lib/generate-game";
import { fetchGames, gameScoreToTableRow, scoreGame } from "../lib/graphql";
import type { GameScore } from "../lib/types";
import { GameEditor } from "./GameEditor";

export function GamePage() {
  const [frames, setFrames] = useState<string[][]>(emptyGameFrames());
  const [extensions, setExtensions] = useState<string[]>([]);
  const [scored, setScored] = useState<GameScore | null>(null);
  const [tableRows, setTableRows] = useState<
    ReturnType<typeof gameScoreToTableRow>[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const draft = useMemo(() => {
    const normalized = frames.map((frame) => normalizeFrame(frame));
    return buildGame(normalized, extensions, true);
  }, [frames, extensions]);

  const editorExtensions = useMemo(() => {
    const normalized = frames.map((frame) => normalizeFrame(frame));
    return buildGame(normalized, extensions, false).extensions;
  }, [frames, extensions]);

  function prependGames(games: GameScore[]) {
    setTableRows((prev) => {
      const incoming = games.map((game) => gameScoreToTableRow(game));
      const merged = [
        ...incoming,
        ...prev.filter(
          (row) =>
            !incoming.some((item) => item.gameId && item.gameId === row.gameId),
        ),
      ];
      return merged.map((row, index) => ({ ...row, label: String(index + 1) }));
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const games = await fetchGames();
        if (cancelled) return;
        setTableRows(
          games.map((game, index) =>
            gameScoreToTableRow(game, String(index + 1)),
          ),
        );
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les games",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleRandomOne() {
    const game = generateRandomGame();
    setFrames(game.frames);
    setExtensions(game.extensions);
    setScored(null);
    setError(null);
  }

  function handleReset() {
    setFrames(emptyGameFrames());
    setExtensions([]);
    setScored(null);
    setError(null);
  }

  function handleScore() {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const result = await scoreGame(draft);
          setScored(result);
          prependGames([result]);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Échec du scoring");
        }
      })();
    });
  }

  function handleRandomTen() {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const batch = generateRandomGames(10);
          const scoredBatch: GameScore[] = [];
          for (const game of batch) {
            scoredBatch.push(await scoreGame(game));
          }
          const last = scoredBatch[scoredBatch.length - 1] ?? null;
          if (last) {
            setScored(last);
            setFrames(batch[batch.length - 1].frames);
            setExtensions(batch[batch.length - 1].extensions);
          }
          // Newest first: reverse batch order (last scored = most recent)
          prependGames([...scoredBatch].reverse());
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Échec du batch aléatoire",
          );
        }
      })();
    });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 p-4 sm:p-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
          GraphQL Bowling
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
          Partie
        </h1>
      </header>

      <GameEditor
        frames={frames}
        extensions={editorExtensions}
        total={scored?.total ?? null}
        pending={pending}
        loading={loading}
        error={error}
        tableRows={tableRows}
        onFramesChange={(next) => {
          const normalized = next.map((frame) => normalizeFrame(frame));
          const built = buildGame(normalized, extensions, false);
          setFrames(next);
          setExtensions(built.extensions);
          setScored(null);
        }}
        onExtensionsChange={(next) => {
          setExtensions(next);
          setScored(null);
        }}
        onRandomOne={handleRandomOne}
        onRandomTen={handleRandomTen}
        onScore={handleScore}
        onReset={handleReset}
      />
    </div>
  );
}
