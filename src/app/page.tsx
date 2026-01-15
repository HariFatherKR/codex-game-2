"use client";

import { useEffect, useMemo, useState } from "react";
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

type TileOffset = {
  row: number;
  col: number;
};

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
  isHidden: boolean;
  offset?: TileOffset;
  isSelected: boolean;
  onClick: () => void;
};

const SWAP_DURATION_MS = 180;
const EXPLOSION_DURATION_MS = 200;
const GRAVITY_DURATION_MS = 250;
const SPAWN_DURATION_MS = 250;

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

function matchesToPositions(matches: Set<string>): CellPosition[] {
  return Array.from(matches)
    .map((key) => {
      const [rowText, colText] = key.split("-");
      return { row: Number(rowText), col: Number(colText) };
    })
    .filter((position) => Number.isInteger(position.row) && Number.isInteger(position.col));
}

function createPositionMap(board: Board): Map<string, Position> {
  const map = new Map<string, Position>();
  board.forEach((row, rowIndex) => {
    row.forEach((tile, colIndex) => {
      map.set(tile.id, { row: rowIndex, col: colIndex });
    });
  });
  return map;
}

function buildOffsets(
  previousBoard: Board,
  nextBoard: Board
): { offsets: Record<string, TileOffset>; spawnIds: Set<string> } {
  const offsets: Record<string, TileOffset> = {};
  const previousPositions = createPositionMap(previousBoard);
  const spawnIds = new Set<string>();

  nextBoard.forEach((row, rowIndex) => {
    row.forEach((tile, colIndex) => {
      const previous = previousPositions.get(tile.id);
      if (previous) {
        offsets[tile.id] = {
          row: previous.row - rowIndex,
          col: previous.col - colIndex
        };
      } else {
        spawnIds.add(tile.id);
      }
    });
  });

  return { offsets, spawnIds };
}

function TileView({
  tile,
  row,
  col,
  phase,
  isExploding,
  isHidden,
  offset,
  isSelected,
  onClick
}: TileViewProps) {
  const rowOffset = offset?.row ?? 0;
  const colOffset = offset?.col ?? 0;
  const className = [
    "tile",
    tile.color,
    isSelected ? "selected" : "",
    isExploding ? "exploding" : "",
    isHidden ? "hidden" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const transitionDuration =
    phase === "swapping"
      ? SWAP_DURATION_MS
      : phase === "exploding"
        ? EXPLOSION_DURATION_MS
        : phase === "gravity" || phase === "spawning"
          ? GRAVITY_DURATION_MS
          : SWAP_DURATION_MS;

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      style={{
        transform: `translate3d(calc((var(--tile-size) + var(--tile-gap)) * ${
          col + colOffset
        }), calc((var(--tile-size) + var(--tile-gap)) * ${row + rowOffset}), 0)`,
        transitionDuration: `${transitionDuration}ms`
      }}
      aria-label={`Tile ${tile.color}`}
    />
  );
}

export default function Home() {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<Position | null>(null);
  const [swapPair, setSwapPair] = useState<SwapPair | null>(null);
  const [tileOffsets, setTileOffsets] = useState<Record<string, TileOffset>>({});
  const [spawnIds, setSpawnIds] = useState<Set<string>>(new Set());
  const [hiddenTiles, setHiddenTiles] = useState<Set<string>>(new Set());
  const [moveInProgress, setMoveInProgress] = useState(false);

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

  useEffect(() => {
    if (!gameState || gameState.phase !== "swapping" || !swapPair) {
      return;
    }

    const firstTile = gameState.board[swapPair.from.row]?.[swapPair.from.col];
    const secondTile = gameState.board[swapPair.to.row]?.[swapPair.to.col];
    if (!firstTile || !secondTile) {
      return;
    }

    setTileOffsets({
      [firstTile.id]: {
        row: swapPair.to.row - swapPair.from.row,
        col: swapPair.to.col - swapPair.from.col
      },
      [secondTile.id]: {
        row: swapPair.from.row - swapPair.to.row,
        col: swapPair.from.col - swapPair.to.col
      }
    });

    const timer = window.setTimeout(() => {
      setTileOffsets({});
      setSwapPair(null);
      setGameState((prev) => {
        if (!prev) {
          return prev;
        }
        const swappedBoard = swapTiles(prev.board, swapPair.from, swapPair.to);
        const matches = findMatches(swappedBoard);
        if (matches.size === 0) {
          return {
            ...prev,
            phase: "idle",
            animatingCells: undefined
          };
        }
        return {
          ...prev,
          board: swappedBoard,
          movesLeft: prev.movesLeft - 1,
          phase: "exploding",
          animatingCells: matchesToPositions(matches)
        };
      });
    }, SWAP_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [gameState, swapPair]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "exploding") {
      return;
    }

    const timer = window.setTimeout(() => {
      setGameState((prev) => {
        if (!prev) {
          return prev;
        }
        const result = resolveBoard(prev.board);
        if (!result.didMatch) {
          return {
            ...prev,
            phase: "idle",
            animatingCells: undefined
          };
        }

        const { offsets, spawnIds: nextSpawnIds } = buildOffsets(prev.board, result.board);
        setTileOffsets(offsets);
        setSpawnIds(nextSpawnIds);
        setHiddenTiles(new Set(nextSpawnIds));

        return {
          ...prev,
          board: result.board,
          score: prev.score + result.matchedCount * 10,
          phase: "gravity",
          animatingCells: undefined
        };
      });
    }, EXPLOSION_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [gameState]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "gravity") {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      setTileOffsets({});
    });

    const timer = window.setTimeout(() => {
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              phase: "spawning"
            }
          : prev
      );
    }, GRAVITY_DURATION_MS);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timer);
    };
  }, [gameState]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "spawning") {
      return;
    }

    const nextOffsets: Record<string, TileOffset> = {};
    spawnIds.forEach((tileId) => {
      gameState.board.forEach((row, rowIndex) => {
        row.forEach((tile, colIndex) => {
          if (tile.id === tileId) {
            nextOffsets[tile.id] = {
              row: -1 - rowIndex,
              col: 0
            };
          }
        });
      });
    });

    setTileOffsets(nextOffsets);

    const animationFrame = window.requestAnimationFrame(() => {
      setTileOffsets({});
      setHiddenTiles(new Set());
    });

    const timer = window.setTimeout(() => {
      setGameState((prev) => {
        if (!prev) {
          return prev;
        }
        const matches = findMatches(prev.board);
        if (matches.size === 0) {
          return {
            ...prev,
            phase: "idle",
            animatingCells: undefined
          };
        }
        return {
          ...prev,
          phase: "exploding",
          animatingCells: matchesToPositions(matches)
        };
      });
    }, SPAWN_DURATION_MS);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timer);
    };
  }, [gameState, spawnIds]);

  useEffect(() => {
    if (!gameState || !activeLevel || gameState.phase !== "idle" || !moveInProgress) {
      return;
    }

    const cleared = checkClearCondition(gameState.score, activeLevel);
    const failed = !cleared && gameState.movesLeft <= 0;
    const nextStatus = cleared ? "clear" : failed ? "fail" : "playing";

    if (nextStatus !== gameState.status) {
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              status: nextStatus
            }
          : prev
      );
    }

    if (nextStatus === "clear") {
      updateProgressOnClear(activeLevel, gameState.score + gameState.movesLeft * 50);
    }

    setMoveInProgress(false);
  }, [activeLevel, gameState, moveInProgress]);

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
      phase: "idle"
    };
    setActiveLevel(level);
    setGameState(nextState);
    setSelected(null);
    setSwapPair(null);
    setTileOffsets({});
    setSpawnIds(new Set());
    setHiddenTiles(new Set());
    setMoveInProgress(false);
  }

  function handleBackToLevels() {
    setActiveLevel(null);
    setGameState(null);
    setSelected(null);
    setSwapPair(null);
    setTileOffsets({});
    setSpawnIds(new Set());
    setHiddenTiles(new Set());
    setMoveInProgress(false);
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

    setSwapPair({ from: selected, to: nextPosition });
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            phase: "swapping",
            animatingCells: undefined
          }
        : prev
    );
    setMoveInProgress(true);
    setSelected(null);
  }

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
              <div className="board" role="grid" aria-label="Match-3 board">
                {gameState.board.map((row, rowIndex) =>
                  row.map((tile, colIndex) => {
                    const isSelected =
                      selected?.row === rowIndex && selected?.col === colIndex;
                    const isExploding = Boolean(
                      gameState.animatingCells?.some(
                        (cell) => cell.row === rowIndex && cell.col === colIndex
                      )
                    );
                    const isHidden = hiddenTiles.has(tile.id);
                    const offset = tileOffsets[tile.id];
                    return (
                      <TileView
                        key={tile.id}
                        tile={tile}
                        row={rowIndex}
                        col={colIndex}
                        phase={gameState.phase}
                        isExploding={isExploding}
                        isHidden={isHidden}
                        offset={offset}
                        isSelected={isSelected}
                        onClick={() => handleTileClick(rowIndex, colIndex)}
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
