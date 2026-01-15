"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { levels, type Level } from "@/data/levels";
import type {
  Board,
  CellPosition,
  GamePhase,
  GameState,
  Tile
} from "@/lib/game/types";
import {
  checkClearCondition,
  createInitialBoard,
  findMatches,
  resolveBoard,
  swapTiles
} from "@/lib/game/logic";

const STORAGE_KEY = "codex-game-progress";

const SWAP_DURATION_MS = 180;
const EXPLOSION_DURATION_MS = 200;
const GRAVITY_DURATION_MS = 250;
const SPAWN_DURATION_MS = 250;

const defaultPhase: GamePhase = "idle";

type Progress = {
  unlockedLevelIds: string[];
  bestScores: Record<string, number>;
};

type Position = {
  row: number;
  col: number;
};

type SwapPair = {
  from: Position;
  to: Position;
};

type PendingSwap = {
  board: Board;
  matches: Set<string>;
  swap: SwapPair;
};

type SpawnInfo = {
  row: number;
  col: number;
  startRow: number;
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
  return Array.from(matches).flatMap((key) => {
    const [rowText, colText] = key.split("-");
    const row = Number(rowText);
    const col = Number(colText);
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      return [];
    }
    return [{ row, col }];
  });
}

function buildSpawnInfo(prevBoard: Board, nextBoard: Board): Record<string, SpawnInfo> {
  const prevIds = new Set(prevBoard.flat().map((tile) => tile.id));
  const size = nextBoard.length;
  const spawnLookup: Record<string, SpawnInfo> = {};

  for (let col = 0; col < size; col += 1) {
    let spawnIndex = 0;
    for (let row = 0; row < size; row += 1) {
      const tile = nextBoard[row]?.[col];
      if (tile && !prevIds.has(tile.id)) {
        spawnLookup[tile.id] = {
          row,
          col,
          startRow: -1 - spawnIndex
        };
        spawnIndex += 1;
      }
    }
  }

  return spawnLookup;
}

export default function Home() {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<Position | null>(null);
  const [swapPair, setSwapPair] = useState<SwapPair | null>(null);
  const [pendingSwap, setPendingSwap] = useState<PendingSwap | null>(null);
  const [spawnInfo, setSpawnInfo] = useState<Record<string, SpawnInfo>>({});

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

  const explodingKeys = useMemo(() => {
    const keys = new Set<string>();
    if (gameState?.animatingCells) {
      gameState.animatingCells.forEach((cell) => {
        keys.add(`${cell.row}-${cell.col}`);
      });
    }
    return keys;
  }, [gameState?.animatingCells]);

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
      phase: defaultPhase
    };
    setActiveLevel(level);
    setGameState(nextState);
    setSelected(null);
    setSwapPair(null);
    setPendingSwap(null);
    setSpawnInfo({});
  }

  function handleBackToLevels() {
    setActiveLevel(null);
    setGameState(null);
    setSelected(null);
    setSwapPair(null);
    setPendingSwap(null);
    setSpawnInfo({});
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
    if (!gameState || gameState.status !== "playing" || !activeLevel) {
      return;
    }

    if (gameState.phase !== "idle") {
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

    const swap: SwapPair = { from: selected, to: nextPosition };
    setSwapPair(swap);
    setPendingSwap({ board: swapped, matches, swap });
    setSelected(null);
    setGameState((prev) => (prev ? { ...prev, phase: "swapping" } : prev));
  }

  useEffect(() => {
    if (!gameState || gameState.phase !== "swapping" || !pendingSwap) {
      return;
    }

    const timer = window.setTimeout(() => {
      setGameState((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          board: pendingSwap.board,
          movesLeft: prev.movesLeft - 1,
          phase: "exploding",
          animatingCells: matchesToPositions(pendingSwap.matches)
        };
      });
      setSwapPair(null);
      setPendingSwap(null);
    }, SWAP_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [gameState, pendingSwap]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "exploding") {
      return;
    }

    const timer = window.setTimeout(() => {
      const result = resolveBoard(gameState.board);
      const nextSpawnInfo = buildSpawnInfo(gameState.board, result.board);
      setSpawnInfo(nextSpawnInfo);
      setGameState((prev) => {
        if (!prev) {
          return prev;
        }
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

    const timer = window.setTimeout(() => {
      setGameState((prev) => (prev ? { ...prev, phase: "spawning" } : prev));
    }, GRAVITY_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [gameState]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "spawning") {
      return;
    }

    const timer = window.setTimeout(() => {
      const matches = findMatches(gameState.board);
      if (matches.size > 0) {
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                phase: "exploding",
                animatingCells: matchesToPositions(matches)
              }
            : prev
        );
        return;
      }

      setSpawnInfo({});

      const cleared = activeLevel ? checkClearCondition(gameState.score, activeLevel) : false;
      const failed = !cleared && gameState.movesLeft <= 0;
      const nextStatus = cleared ? "clear" : failed ? "fail" : "playing";

      setGameState((prev) =>
        prev
          ? {
              ...prev,
              phase: "idle",
              status: nextStatus
            }
          : prev
      );

      if (cleared && activeLevel) {
        updateProgressOnClear(activeLevel, gameState.score + gameState.movesLeft * 50);
      }
    }, SPAWN_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [activeLevel, gameState]);

  const boardPhaseClass = gameState ? `phase-${gameState.phase}` : "";

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
              <div className={`board ${boardPhaseClass}`}>
                <div className="board-inner" role="grid">
                  {gameState.board.map((row, rowIndex) =>
                    row.map((tile, colIndex) => {
                      const isSelected =
                        selected?.row === rowIndex && selected?.col === colIndex;
                      const isExploding = explodingKeys.has(`${rowIndex}-${colIndex}`);
                      return (
                        <TileView
                          key={tile.id}
                          tile={tile}
                          row={rowIndex}
                          col={colIndex}
                          phase={gameState.phase}
                          isExploding={isExploding}
                          isSelected={isSelected}
                          swapPair={swapPair}
                          spawnInfo={spawnInfo}
                          onClick={() => handleTileClick(rowIndex, colIndex)}
                          disabled={
                            gameState.status !== "playing" || gameState.phase !== "idle"
                          }
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {activeLevel && gameState && gameState.status !== "playing" && (
        <div className="result-modal" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>{gameState.status === "clear" ? "Level Clear!" : "Level Failed"}</h2>
            <p>Final Score: {finalScore}</p>
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

type TileViewProps = {
  tile: Tile;
  row: number;
  col: number;
  phase: GamePhase;
  isExploding: boolean;
  isSelected: boolean;
  swapPair: SwapPair | null;
  spawnInfo: Record<string, SpawnInfo>;
  onClick: () => void;
  disabled: boolean;
};

function TileView({
  tile,
  row,
  col,
  phase,
  isExploding,
  isSelected,
  swapPair,
  spawnInfo,
  onClick,
  disabled
}: TileViewProps) {
  let displayRow = row;
  let displayCol = col;

  if (phase === "swapping" && swapPair) {
    if (row === swapPair.from.row && col === swapPair.from.col) {
      displayRow = swapPair.to.row;
      displayCol = swapPair.to.col;
    } else if (row === swapPair.to.row && col === swapPair.to.col) {
      displayRow = swapPair.from.row;
      displayCol = swapPair.from.col;
    }
  }

  const spawn = spawnInfo[tile.id];
  const isSpawningTile = Boolean(spawn);
  const opacity = isSpawningTile && phase === "gravity" ? 0 : 1;

  if (spawn && phase === "gravity") {
    displayRow = spawn.startRow;
    displayCol = spawn.col;
  }

  const className = `tile ${tile.color} ${isSelected ? "selected" : ""} ${
    isExploding ? "exploding" : ""
  }`;

  return (
    <button
      type="button"
      className={className}
      style={
        {
          "--tile-row": displayRow,
          "--tile-col": displayCol,
          opacity
        } as CSSProperties
      }
      onClick={onClick}
      aria-label={`Tile ${tile.color}`}
      disabled={disabled}
    />
  );
}
