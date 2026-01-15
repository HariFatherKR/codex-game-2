"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { levels, type Level } from "@/data/levels";
import type { Board, CellPosition, GamePhase, GameState, Tile } from "@/lib/game/types";
import {
  checkClearCondition,
  createInitialBoard,
  findMatches,
  resolveBoard,
  swapTiles
} from "@/lib/game/logic";

const STORAGE_KEY = "codex-game-progress";

type Progress = {
  unlockedLevelIds: string[];
  bestScores: Record<string, number>;
};

type Position = {
  row: number;
  col: number;
};

type Offset = {
  x: number;
  y: number;
};

type TileOffsets = Record<string, Offset>;

type SwapPair = {
  from: Position;
  to: Position;
};

type TileViewProps = {
  tile: Tile;
  row: number;
  col: number;
  phase: GamePhase;
  isExploding: boolean;
  isSelected: boolean;
  isPendingSpawn: boolean;
  isSpawning: boolean;
  offset?: Offset;
  onClick: () => void;
  isDisabled: boolean;
};

const SWAP_DURATION = 180;
const EXPLOSION_DURATION = 200;
const GRAVITY_DURATION = 250;
const SPAWN_DURATION = 250;

const defaultProgress: Progress = {
  unlockedLevelIds: [levels[0]?.id ?? ""].filter(Boolean),
  bestScores: {}
};

function loadProgress(): Progress {
  if (typeof window === "undefined") {
    return defaultProgress;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return defaultProgress;
  }

  try {
    const parsed = JSON.parse(stored) as Progress;
    const unlocked = Array.isArray(parsed.unlockedLevelIds)
      ? parsed.unlockedLevelIds
      : defaultProgress.unlockedLevelIds;
    const bestScores = parsed.bestScores && typeof parsed.bestScores === "object"
      ? parsed.bestScores
      : defaultProgress.bestScores;

    return {
      unlockedLevelIds: unlocked.length > 0 ? unlocked : defaultProgress.unlockedLevelIds,
      bestScores
    };
  } catch {
    return defaultProgress;
  }
}

function mapPositions(board: Board): Record<string, Position> {
  const positions: Record<string, Position> = {};
  board.forEach((row, rowIndex) => {
    row.forEach((tile, colIndex) => {
      positions[tile.id] = { row: rowIndex, col: colIndex };
    });
  });
  return positions;
}

function TileView({
  tile,
  row,
  col,
  phase,
  isExploding,
  isSelected,
  isPendingSpawn,
  isSpawning,
  offset,
  onClick,
  isDisabled
}: TileViewProps) {
  const moveDuration =
    phase === "swapping"
      ? `${SWAP_DURATION}ms`
      : phase === "gravity" || phase === "spawning"
        ? `${GRAVITY_DURATION}ms`
        : "0ms";

  const style = {
    "--row": row,
    "--col": col,
    "--offset-x": offset?.x ?? 0,
    "--offset-y": offset?.y ?? 0,
    "--move-duration": moveDuration,
    "--fade-duration": phase === "spawning" ? `${SPAWN_DURATION}ms` : "0ms"
  } as CSSProperties;

  const className = [
    "tile",
    tile.color,
    isSelected ? "selected" : "",
    isExploding ? "exploding" : "",
    isPendingSpawn ? "pending-spawn" : "",
    isSpawning ? "spawning" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={onClick}
      aria-label={`Tile ${tile.color}`}
      disabled={isDisabled}
    />
  );
}

export default function Home() {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<Position | null>(null);
  const [swapPair, setSwapPair] = useState<SwapPair | null>(null);
  const [tileOffsets, setTileOffsets] = useState<TileOffsets>({});
  const [explodingCells, setExplodingCells] = useState<Set<string>>(new Set());
  const [previousPositions, setPreviousPositions] = useState<Record<string, Position>>({});
  const [newTileIds, setNewTileIds] = useState<Set<string>>(new Set());
  const [isSpawningStart, setIsSpawningStart] = useState(false);

  useEffect(() => {
    const stored = loadProgress();
    setProgress(stored);
  }, []);

  const unlockedLevels = useMemo(() => {
    return new Set(progress.unlockedLevelIds);
  }, [progress.unlockedLevelIds]);

  const bestScoreForActive =
    activeLevel && progress.bestScores[activeLevel.id]
      ? progress.bestScores[activeLevel.id]
      : 0;

  const finalScore =
    activeLevel && gameState
      ? gameState.score + gameState.movesLeft * 50
      : 0;

  function persistProgress(next: Progress) {
    setProgress(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }

  function startLevel(level: Level) {
    const board = createInitialBoard();
    const nextState: GameState = {
      board,
      score: 0,
      movesLeft: level.movesLimit,
      status: "playing",
      phase: "idle",
      animatingCells: []
    };
    setActiveLevel(level);
    setGameState(nextState);
    setSelected(null);
    setSwapPair(null);
    setTileOffsets({});
    setExplodingCells(new Set());
    setPreviousPositions({});
    setNewTileIds(new Set());
    setIsSpawningStart(false);
  }

  function handleBackToLevels() {
    setActiveLevel(null);
    setGameState(null);
    setSelected(null);
    setSwapPair(null);
  }

  function handleRetry() {
    if (activeLevel) {
      startLevel(activeLevel);
    }
  }

  function updateProgressOnClear(level: Level, score: number) {
    const currentBest = progress.bestScores[level.id] ?? 0;
    const nextBest = score > currentBest ? score : currentBest;
    const nextUnlocked = new Set(progress.unlockedLevelIds);
    nextUnlocked.add(level.id);
    const levelIndex = levels.findIndex((item) => item.id === level.id);
    const nextLevel = levels[levelIndex + 1];
    if (nextLevel) {
      nextUnlocked.add(nextLevel.id);
    }

    persistProgress({
      unlockedLevelIds: Array.from(nextUnlocked),
      bestScores: {
        ...progress.bestScores,
        [level.id]: nextBest
      }
    });
  }

  function areAdjacent(first: Position, second: Position): boolean {
    const rowDiff = Math.abs(first.row - second.row);
    const colDiff = Math.abs(first.col - second.col);
    return rowDiff + colDiff === 1;
  }

  function handleTileClick(row: number, col: number) {
    if (
      !gameState ||
      gameState.status !== "playing" ||
      gameState.phase !== "idle" ||
      !activeLevel
    ) {
      return;
    }

    const nextPosition: Position = { row, col };

    if (!selected) {
      setSelected(nextPosition);
      return;
    }

    if (selected.row === row && selected.col === col) {
      setSelected(null);
      return;
    }

    if (!areAdjacent(selected, nextPosition)) {
      setSelected(nextPosition);
      return;
    }

    const swapped = swapTiles(gameState.board, selected, nextPosition);
    const matches = findMatches(swapped);
    if (matches.size === 0) {
      setSelected(null);
      return;
    }

    const fromTile = gameState.board[selected.row]?.[selected.col];
    const toTile = gameState.board[nextPosition.row]?.[nextPosition.col];
    if (!fromTile || !toTile) {
      return;
    }

    setSwapPair({ from: selected, to: nextPosition });
    setTileOffsets({
      [fromTile.id]: {
        x: nextPosition.col - selected.col,
        y: nextPosition.row - selected.row
      },
      [toTile.id]: {
        x: selected.col - nextPosition.col,
        y: selected.row - nextPosition.row
      }
    });
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            phase: "swapping"
          }
        : prev
    );
    setSelected(null);
  }

  useEffect(() => {
    if (!gameState || gameState.phase !== "swapping" || !swapPair) {
      return;
    }

    const timer = setTimeout(() => {
      setGameState((prev) => {
        if (!prev || prev.phase !== "swapping") {
          return prev;
        }
        const swappedBoard = swapTiles(prev.board, swapPair.from, swapPair.to);
        return {
          ...prev,
          board: swappedBoard,
          movesLeft: prev.movesLeft - 1,
          phase: "exploding"
        };
      });
      setSwapPair(null);
      setTileOffsets({});
    }, SWAP_DURATION);

    return () => clearTimeout(timer);
  }, [gameState?.phase, swapPair]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "exploding") {
      return;
    }

    const matches = findMatches(gameState.board);
    if (matches.size === 0) {
      setExplodingCells(new Set());
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              phase: "idle",
              animatingCells: []
            }
          : prev
      );
      return;
    }

    const cellList: CellPosition[] = [];
    matches.forEach((key) => {
      const [rowText, colText] = key.split("-");
      const row = Number(rowText);
      const col = Number(colText);
      if (Number.isInteger(row) && Number.isInteger(col)) {
        cellList.push({ row, col });
      }
    });

    setExplodingCells(matches);
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            animatingCells: cellList
          }
        : prev
    );

    const timer = setTimeout(() => {
      setGameState((prev) => {
        if (!prev || prev.phase !== "exploding") {
          return prev;
        }
        const prevBoard = prev.board;
        const result = resolveBoard(prevBoard);
        const prevPositionsMap = mapPositions(prevBoard);
        const prevIds = new Set(Object.keys(prevPositionsMap));
        const nextNewIds = new Set<string>();
        result.board.forEach((row) => {
          row.forEach((tile) => {
            if (!prevIds.has(tile.id)) {
              nextNewIds.add(tile.id);
            }
          });
        });

        setPreviousPositions(prevPositionsMap);
        setNewTileIds(nextNewIds);

        return {
          ...prev,
          board: result.board,
          score: prev.score + result.matchedCount * 10,
          phase: "gravity",
          animatingCells: []
        };
      });
      setExplodingCells(new Set());
    }, EXPLOSION_DURATION);

    return () => clearTimeout(timer);
  }, [gameState?.phase, gameState?.board]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "gravity") {
      return;
    }

    const offsets: TileOffsets = {};
    gameState.board.forEach((row, rowIndex) => {
      row.forEach((tile, colIndex) => {
        const prev = previousPositions[tile.id];
        if (prev) {
          const deltaX = prev.col - colIndex;
          const deltaY = prev.row - rowIndex;
          if (deltaX !== 0 || deltaY !== 0) {
            offsets[tile.id] = { x: deltaX, y: deltaY };
          }
        }
      });
    });

    setTileOffsets(offsets);
    const raf = requestAnimationFrame(() => setTileOffsets({}));
    const timer = setTimeout(() => {
      setGameState((prev) =>
        prev && prev.phase === "gravity"
          ? {
              ...prev,
              phase: "spawning"
            }
          : prev
      );
    }, GRAVITY_DURATION);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [gameState?.phase, gameState?.board, previousPositions]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "spawning") {
      return;
    }

    const offsets: TileOffsets = {};
    gameState.board.forEach((row, rowIndex) => {
      row.forEach((tile) => {
        if (newTileIds.has(tile.id)) {
          offsets[tile.id] = { x: 0, y: -1 - rowIndex };
        }
      });
    });

    setIsSpawningStart(true);
    setTileOffsets(offsets);
    const raf = requestAnimationFrame(() => {
      setTileOffsets({});
      setIsSpawningStart(false);
    });

    const timer = setTimeout(() => {
      const matches = findMatches(gameState.board);
      if (matches.size > 0) {
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                phase: "exploding"
              }
            : prev
        );
        return;
      }

      setGameState((prev) => {
        if (!prev) {
          return prev;
        }
        const cleared = activeLevel
          ? checkClearCondition(prev.score, activeLevel)
          : false;
        const failed = !cleared && prev.movesLeft <= 0;
        const nextStatus = cleared ? "clear" : failed ? "fail" : "playing";
        return {
          ...prev,
          phase: "idle",
          status: nextStatus
        };
      });
    }, SPAWN_DURATION);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [activeLevel, gameState?.phase, gameState?.board, newTileIds]);

  useEffect(() => {
    if (!gameState || !activeLevel) {
      return;
    }

    if (gameState.status === "clear") {
      updateProgressOnClear(activeLevel, gameState.score + gameState.movesLeft * 50);
    }
  }, [activeLevel, gameState?.status, gameState?.score, gameState?.movesLeft]);

  const explodingLookup = useMemo(() => {
    const lookup = new Set<string>();
    explodingCells.forEach((key) => lookup.add(key));
    return lookup;
  }, [explodingCells]);

  const isAnimating = Boolean(gameState && gameState.phase !== "idle");

  return (
    <main>
      <div className="app">
        <header>
          <h1>Match-3 MVP</h1>
          <p>Swap adjacent tiles to reach the target score within the move limit.</p>
        </header>

        {!activeLevel && (
          <section>
            <h2>Select a Level</h2>
            <div className="level-grid">
              {levels.map((level) => {
                const unlocked = unlockedLevels.has(level.id);
                const bestScore = progress.bestScores[level.id] ?? 0;
                return (
                  <div className="level-card" key={level.id}>
                    <div>
                      <h3>{level.name}</h3>
                      <p>Target Score: {level.targetScore}</p>
                      <p>Moves Limit: {level.movesLimit}</p>
                      <p>Best Score: {bestScore}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startLevel(level)}
                      disabled={!unlocked}
                    >
                      {unlocked ? "Play" : "Locked"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeLevel && gameState && (
          <section className="game-panel">
            <div className="info-card">
              <h2>{activeLevel.name}</h2>
              <p>Target Score: {activeLevel.targetScore}</p>
              <p>Score: {gameState.score}</p>
              <p>Moves Left: {gameState.movesLeft}</p>
              <p>Best Score: {bestScoreForActive}</p>
              <button type="button" className="secondary-button" onClick={handleBackToLevels}>
                Back to Levels
              </button>
            </div>

            <div>
              <div className="board">
                {gameState.board.map((row, rowIndex) =>
                  row.map((tile, colIndex) => {
                    const isSelected =
                      selected?.row === rowIndex && selected?.col === colIndex;
                    const explodeKey = `${rowIndex}-${colIndex}`;
                    const isExploding = explodingLookup.has(explodeKey);
                    const isPendingSpawn =
                      gameState.phase === "gravity" && newTileIds.has(tile.id);
                    const isSpawning = isSpawningStart && newTileIds.has(tile.id);
                    return (
                      <TileView
                        key={tile.id}
                        tile={tile}
                        row={rowIndex}
                        col={colIndex}
                        phase={gameState.phase}
                        isExploding={isExploding}
                        isSelected={isSelected}
                        isPendingSpawn={isPendingSpawn}
                        isSpawning={isSpawning}
                        offset={tileOffsets[tile.id]}
                        onClick={() => handleTileClick(rowIndex, colIndex)}
                        isDisabled={Boolean(isAnimating) || gameState.status !== "playing"}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {activeLevel && gameState && gameState.status !== "playing" && (
        <div className="result-modal" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>{gameState.status === "clear" ? "Level Clear!" : "Level Failed"}</h2>
            <p>
              Final Score: {finalScore}
            </p>
            <div className="modal-actions">
              <button type="button" className="primary-button" onClick={handleRetry}>
                Retry
              </button>
              <button type="button" className="secondary-button" onClick={handleBackToLevels}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
