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
const SWAP_DURATION = 180;
const EXPLOSION_DURATION = 200;
const GRAVITY_DURATION = 250;
const SPAWN_DURATION = 250;

type Progress = {
  unlockedLevelIds: string[];
  bestScores: Record<string, number>;
};

type Position = {
  row: number;
  col: number;
};

type SwapAnimation = {
  from: Position;
  to: Position;
  swappedBoard: Board;
};

type SpawnAnimation = {
  spawnRowsById: Record<string, number>;
  spawnIds: string[];
};

type TileViewProps = {
  tile: Tile;
  row: number;
  col: number;
  phase: GamePhase;
  isExploding: boolean;
  isSelected?: boolean;
  displayRow?: number;
  displayCol?: number;
  isHidden?: boolean;
  isSpawning?: boolean;
  isSpawnStart?: boolean;
  onClick: () => void;
  disabled: boolean;
};

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
  return Array.from(matches).map((key) => {
    const [rowText, colText] = key.split("-");
    return { row: Number(rowText), col: Number(colText) };
  });
}

function buildSpawnAnimation(prevBoard: Board, nextBoard: Board): SpawnAnimation {
  const previousIds = new Set(prevBoard.flat().map((tile) => tile.id));
  const spawnRowsById: Record<string, number> = {};
  const spawnIds: string[] = [];
  const size = nextBoard.length;

  for (let col = 0; col < size; col += 1) {
    let newCount = 0;
    for (let row = 0; row < size; row += 1) {
      const tile = nextBoard[row]?.[col];
      if (tile && !previousIds.has(tile.id)) {
        newCount += 1;
      } else {
        break;
      }
    }

    for (let row = 0; row < newCount; row += 1) {
      const tile = nextBoard[row]?.[col];
      if (tile) {
        spawnRowsById[tile.id] = row - newCount;
        spawnIds.push(tile.id);
      }
    }
  }

  return { spawnRowsById, spawnIds };
}

function TileView({
  tile,
  row,
  col,
  phase,
  isExploding,
  isSelected = false,
  displayRow = row,
  displayCol = col,
  isHidden = false,
  isSpawning = false,
  isSpawnStart = false,
  onClick,
  disabled
}: TileViewProps) {
  const className = [
    "tile",
    tile.color,
    isSelected ? "selected" : "",
    isExploding ? "exploding" : "",
    isHidden ? "hidden" : "",
    isSpawning ? "spawning" : "",
    isSpawnStart ? "spawn-start" : "spawn-end"
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      key={tile.id}
      type="button"
      className={className}
      onClick={onClick}
      aria-label={`Tile ${tile.color}`}
      disabled={disabled}
      style={{
        "--tile-x": `calc(${displayCol} * (var(--tile-size) + var(--tile-gap)))`,
        "--tile-y": `calc(${displayRow} * (var(--tile-size) + var(--tile-gap)))`
      } as CSSProperties}
    />
  );
}

export default function Home() {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<Position | null>(null);
  const [swapAnimation, setSwapAnimation] = useState<SwapAnimation | null>(null);
  const [spawnAnimation, setSpawnAnimation] = useState<SpawnAnimation | null>(null);
  const [spawnStage, setSpawnStage] = useState<"start" | "end">("end");

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
      phase: "idle"
    };
    setActiveLevel(level);
    setGameState(nextState);
    setSelected(null);
    setSwapAnimation(null);
    setSpawnAnimation(null);
  }

  function handleBackToLevels() {
    setActiveLevel(null);
    setGameState(null);
    setSelected(null);
    setSwapAnimation(null);
    setSpawnAnimation(null);
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

    setSelected(null);
    setSwapAnimation({
      from: selected,
      to: nextPosition,
      swappedBoard: swapped
    });
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            phase: "swapping"
          }
        : prev
    );
  }

  useEffect(() => {
    if (!gameState || gameState.phase !== "swapping" || !swapAnimation) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setGameState((prev) => {
        if (!prev) {
          return prev;
        }
        const matches = findMatches(swapAnimation.swappedBoard);
        const animatingCells = matchesToPositions(matches);
        return {
          ...prev,
          board: swapAnimation.swappedBoard,
          movesLeft: prev.movesLeft - 1,
          phase: matches.size > 0 ? "exploding" : "idle",
          animatingCells
        };
      });
      setSwapAnimation(null);
    }, SWAP_DURATION);

    return () => window.clearTimeout(timeout);
  }, [gameState, swapAnimation]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "exploding") {
      return;
    }

    const timeout = window.setTimeout(() => {
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
        const nextScore = prev.score + result.matchedCount * 10;
        const spawnData = buildSpawnAnimation(prev.board, result.board);
        setSpawnAnimation(spawnData);
        return {
          ...prev,
          board: result.board,
          score: nextScore,
          phase: "gravity",
          animatingCells: undefined
        };
      });
    }, EXPLOSION_DURATION);

    return () => window.clearTimeout(timeout);
  }, [gameState]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "gravity") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              phase: "spawning"
            }
          : prev
      );
    }, GRAVITY_DURATION);

    return () => window.clearTimeout(timeout);
  }, [gameState]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "spawning") {
      return;
    }

    setSpawnStage("start");
    const raf = window.requestAnimationFrame(() => setSpawnStage("end"));
    const timeout = window.setTimeout(() => {
      setGameState((prev) => {
        if (!prev || !activeLevel) {
          return prev;
        }
        const matches = findMatches(prev.board);
        if (matches.size > 0) {
          return {
            ...prev,
            phase: "exploding",
            animatingCells: matchesToPositions(matches)
          };
        }
        const cleared = checkClearCondition(prev.score, activeLevel);
        const failed = !cleared && prev.movesLeft <= 0;
        const nextStatus = cleared ? "clear" : failed ? "fail" : "playing";
        if (nextStatus === "clear") {
          updateProgressOnClear(activeLevel, prev.score + prev.movesLeft * 50);
        }
        return {
          ...prev,
          phase: "idle",
          status: nextStatus,
          animatingCells: undefined
        };
      });
      setSpawnAnimation(null);
    }, SPAWN_DURATION);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [gameState, activeLevel]);

  const explodingKeys = useMemo(() => {
    if (!gameState?.animatingCells) {
      return new Set<string>();
    }
    return new Set(gameState.animatingCells.map(({ row, col }) => `${row}-${col}`));
  }, [gameState?.animatingCells]);

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
              <div className={`board phase-${gameState.phase}`}>
                {gameState.board.map((row, rowIndex) =>
                  row.map((tile, colIndex) => {
                    const isSelected =
                      selected?.row === rowIndex && selected?.col === colIndex;
                    const positionKey = `${rowIndex}-${colIndex}`;
                    const isExploding =
                      gameState.phase === "exploding" && explodingKeys.has(positionKey);
                    const fromTile =
                      swapAnimation?.from &&
                      gameState.board[swapAnimation.from.row]?.[swapAnimation.from.col];
                    const toTile =
                      swapAnimation?.to &&
                      gameState.board[swapAnimation.to.row]?.[swapAnimation.to.col];
                    let displayRow = rowIndex;
                    let displayCol = colIndex;

                    if (gameState.phase === "swapping" && swapAnimation) {
                      if (fromTile?.id === tile.id) {
                        displayRow = swapAnimation.to.row;
                        displayCol = swapAnimation.to.col;
                      } else if (toTile?.id === tile.id) {
                        displayRow = swapAnimation.from.row;
                        displayCol = swapAnimation.from.col;
                      }
                    }

                    const isSpawningTile =
                      gameState.phase === "spawning" &&
                      spawnAnimation?.spawnIds.includes(tile.id);
                    const isSpawnStart =
                      gameState.phase === "spawning" && spawnStage === "start";

                    if (isSpawningTile && isSpawnStart && spawnAnimation) {
                      const spawnRow = spawnAnimation.spawnRowsById[tile.id];
                      if (spawnRow !== undefined) {
                        displayRow = spawnRow;
                      }
                    }

                    const isHidden =
                      gameState.phase === "gravity" &&
                      spawnAnimation?.spawnIds.includes(tile.id);
                    const isDisabled =
                      gameState.phase !== "idle" || gameState.status !== "playing";

                    return (
                      <TileView
                        key={tile.id}
                        tile={tile}
                        row={rowIndex}
                        col={colIndex}
                        phase={gameState.phase}
                        isExploding={isExploding}
                        isSelected={isSelected}
                        displayRow={displayRow}
                        displayCol={displayCol}
                        isHidden={isHidden}
                        isSpawning={isSpawningTile}
                        isSpawnStart={isSpawnStart}
                        onClick={() => handleTileClick(rowIndex, colIndex)}
                        disabled={isDisabled}
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
