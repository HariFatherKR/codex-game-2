"use client";

import { useEffect, useMemo, useState } from "react";
import { levels, type Level } from "@/data/levels";
import type { Board, GameState } from "@/lib/game/types";
import {
  checkClearCondition,
  createInitialBoard,
  findMatches,
  resolveBoard,
  swapTiles
} from "@/lib/game/logic";
import TileView from "@/app/TileView";

const STORAGE_KEY = "codex-game-progress";
const BOARD_GAP = 6;
const MIN_TOUCH_SIZE = 44;
const MAX_TILE_SIZE = 56;

type Progress = {
  unlockedLevelIds: string[];
  bestScores: Record<string, number>;
};

type Position = {
  row: number;
  col: number;
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

export default function Home() {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<Position | null>(null);
  const [screenWidth, setScreenWidth] = useState(0);

  useEffect(() => {
    const stored = loadProgress();
    setProgress(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateWidth = () => {
      setScreenWidth(window.innerWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);

    return () => {
      window.removeEventListener("resize", updateWidth);
    };
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
      status: "playing"
    };
    setActiveLevel(level);
    setGameState(nextState);
    setSelected(null);
  }

  function handleBackToLevels() {
    setActiveLevel(null);
    setGameState(null);
    setSelected(null);
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

    let workingBoard: Board = swapped;
    let totalMatched = 0;
    let didResolve = true;

    while (didResolve) {
      const result = resolveBoard(workingBoard);
      if (!result.didMatch) {
        didResolve = false;
      } else {
        totalMatched += result.matchedCount;
        workingBoard = result.board;
      }
    }

    const nextScore = gameState.score + totalMatched * 10;
    const nextMoves = gameState.movesLeft - 1;
    const cleared = checkClearCondition(nextScore, activeLevel);
    const failed = !cleared && nextMoves <= 0;
    const nextStatus = cleared ? "clear" : failed ? "fail" : "playing";

    const nextState: GameState = {
      board: workingBoard,
      score: nextScore,
      movesLeft: nextMoves,
      status: nextStatus
    };

    setGameState(nextState);
    setSelected(null);

    if (nextStatus === "clear") {
      updateProgressOnClear(activeLevel, nextScore + nextMoves * 50);
    }
  }

  const boardColumns = gameState?.board[0]?.length ?? 8;
  const boardRows = gameState?.board.length ?? 8;
  const tileSize = useMemo(() => {
    if (!screenWidth) {
      return 48;
    }

    const computed = Math.min(
      Math.floor(screenWidth / boardColumns) - BOARD_GAP,
      MAX_TILE_SIZE
    );

    return Math.max(computed, MIN_TOUCH_SIZE);
  }, [boardColumns, screenWidth]);

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
              <div
                className="board"
                style={{
                  gridTemplateColumns: `repeat(${boardColumns}, ${tileSize}px)`,
                  gridTemplateRows: `repeat(${boardRows}, ${tileSize}px)`,
                  gap: BOARD_GAP
                }}
              >
                {gameState.board.map((row, rowIndex) =>
                  row.map((tile, colIndex) => {
                    const isSelected =
                      selected?.row === rowIndex && selected?.col === colIndex;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        className="tile-button"
                        onClick={() => handleTileClick(rowIndex, colIndex)}
                        aria-label={`Tile ${tile.color}`}
                      >
                        <TileView
                          color={tile.color}
                          size={tileSize}
                          selected={isSelected}
                        />
                      </button>
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
