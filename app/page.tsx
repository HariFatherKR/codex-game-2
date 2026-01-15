"use client";

import { useEffect, useMemo, useState } from "react";
import { levels, type Level } from "../data/levels";
import { createInitialBoard } from "../lib/game/board";
import {
  checkClearCondition,
  findMatches,
  resolveBoard,
  swapTiles
} from "../lib/game/logic";
import type { GameState, Position, Progress } from "../lib/game/types";

const PROGRESS_KEY = "codex-match-3-progress";

const defaultProgress: Progress = {
  unlockedLevelIds: [levels[0]?.id ?? "level-1"],
  bestScores: {}
};

function loadProgress(): Progress {
  if (typeof window === "undefined") {
    return defaultProgress;
  }

  const stored = window.localStorage.getItem(PROGRESS_KEY);
  if (!stored) {
    return defaultProgress;
  }

  try {
    const parsed = JSON.parse(stored) as Progress;
    if (
      Array.isArray(parsed.unlockedLevelIds) &&
      typeof parsed.bestScores === "object" &&
      parsed.bestScores !== null
    ) {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to parse progress", error);
  }

  return defaultProgress;
}

function saveProgress(progress: Progress): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function isAdjacent(first: Position, second: Position): boolean {
  const rowDiff = Math.abs(first.row - second.row);
  const colDiff = Math.abs(first.col - second.col);
  return rowDiff + colDiff === 1;
}

export default function HomePage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  useEffect(() => {
    const storedProgress = loadProgress();
    setProgress(storedProgress);
  }, []);

  const selectedLevel = useMemo(() => {
    if (!selectedLevelId) {
      return null;
    }

    return levels.find((level) => level.id === selectedLevelId) ?? null;
  }, [selectedLevelId]);

  const startLevel = (level: Level) => {
    const newGameState: GameState = {
      board: createInitialBoard(),
      score: 0,
      movesLeft: level.movesLimit,
      status: "playing"
    };

    setSelectedLevelId(level.id);
    setGameState(newGameState);
    setSelectedPosition(null);
  };

  const handleTileClick = (row: number, col: number) => {
    if (!gameState || !selectedLevel) {
      return;
    }

    if (gameState.status !== "playing") {
      return;
    }

    const nextPosition: Position = { row, col };

    if (!selectedPosition) {
      setSelectedPosition(nextPosition);
      return;
    }

    if (selectedPosition.row === row && selectedPosition.col === col) {
      setSelectedPosition(null);
      return;
    }

    if (!isAdjacent(selectedPosition, nextPosition)) {
      setSelectedPosition(nextPosition);
      return;
    }

    const swappedBoard = swapTiles(gameState.board, selectedPosition, nextPosition);
    const matches = findMatches(swappedBoard);

    if (matches.size === 0) {
      setSelectedPosition(null);
      return;
    }

    const resolved = resolveBoard(swappedBoard);
    const updatedScore = gameState.score + resolved.scoreGained;
    const updatedMovesLeft = Math.max(gameState.movesLeft - 1, 0);
    const isClear = checkClearCondition(updatedScore, selectedLevel.targetScore);
    const status: GameState["status"] = isClear
      ? "clear"
      : updatedMovesLeft === 0
        ? "fail"
        : "playing";

    const nextGameState: GameState = {
      board: resolved.board,
      score: updatedScore,
      movesLeft: updatedMovesLeft,
      status
    };

    setGameState(nextGameState);
    setSelectedPosition(null);

    if (isClear && progress) {
      const bonusScore = updatedMovesLeft * 50;
      const finalScore = updatedScore + bonusScore;
      const existingBest = progress.bestScores[selectedLevel.id] ?? 0;
      const nextBestScores = {
        ...progress.bestScores,
        [selectedLevel.id]: Math.max(existingBest, finalScore)
      };

      const currentIndex = levels.findIndex((level) => level.id === selectedLevel.id);
      const nextLevel = levels[currentIndex + 1];
      const unlockedLevelIds = progress.unlockedLevelIds.slice();

      if (nextLevel && !unlockedLevelIds.includes(nextLevel.id)) {
        unlockedLevelIds.push(nextLevel.id);
      }

      const nextProgress: Progress = {
        unlockedLevelIds,
        bestScores: nextBestScores
      };

      setProgress(nextProgress);
      saveProgress(nextProgress);
    }
  };

  const handleRetry = () => {
    if (selectedLevel) {
      startLevel(selectedLevel);
    }
  };

  const handleBackToLevels = () => {
    setSelectedLevelId(null);
    setGameState(null);
    setSelectedPosition(null);
  };

  if (!progress) {
    return <div>Loading...</div>;
  }

  if (!selectedLevel || !gameState) {
    return (
      <section>
        <h1>Match-3 Levels</h1>
        <p className="notice">Reach the target score before your moves run out.</p>
        <div className="level-grid">
          {levels.map((level) => {
            const isUnlocked = progress.unlockedLevelIds.includes(level.id);
            const bestScore = progress.bestScores[level.id];
            return (
              <div key={level.id} className="level-card">
                <div>
                  <h3>{level.name}</h3>
                  <span>Target Score: {level.targetScore}</span>
                  <br />
                  <span>Moves: {level.movesLimit}</span>
                  {typeof bestScore === "number" ? (
                    <div>
                      <span>Best: {bestScore}</span>
                    </div>
                  ) : null}
                </div>
                <button disabled={!isUnlocked} onClick={() => startLevel(level)}>
                  {isUnlocked ? "Play" : "Locked"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  const finalScore =
    gameState.status === "clear"
      ? gameState.score + gameState.movesLeft * 50
      : gameState.score;

  return (
    <section>
      <h1>{selectedLevel.name}</h1>
      <p className="notice">Swap adjacent tiles to make matches of 3 or more.</p>
      <div className="status-panel">
        <div className="status-box">
          <strong>Score</strong>
          <div>{gameState.score}</div>
        </div>
        <div className="status-box">
          <strong>Moves Left</strong>
          <div>{gameState.movesLeft}</div>
        </div>
        <div className="status-box">
          <strong>Target</strong>
          <div>{selectedLevel.targetScore}</div>
        </div>
      </div>
      <div className="board">
        {gameState.board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${rowIndex}-${colIndex}`}
                  className="tile"
                  aria-hidden="true"
                />
              );
            }
            const isSelected =
              selectedPosition?.row === rowIndex && selectedPosition.col === colIndex;
            return (
              <button
                key={cell.id}
                type="button"
                className={`tile ${cell.color} ${isSelected ? "selected" : ""}`}
                onClick={() => handleTileClick(rowIndex, colIndex)}
                aria-label={`Tile ${cell.color}`}
              >
                {cell.color}
              </button>
            );
          })
        )}
      </div>
      {gameState.status !== "playing" ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{gameState.status === "clear" ? "Level Clear!" : "Out of moves"}</h2>
            <p>
              {gameState.status === "clear"
                ? `Final Score: ${finalScore}`
                : "Try again to reach the target score."}
            </p>
            <div className="modal-actions">
              <button className="secondary" onClick={handleBackToLevels}>
                Back to Levels
              </button>
              <button onClick={handleRetry}>Retry</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
