"use client";

import { useMemo, useState, useEffect } from "react";
import { levels, type Level } from "@/data/levels";
import {
  checkClearCondition,
  findMatches,
  resolveBoard,
  swapTiles
} from "@/lib/game/logic";
import { TILE_COLORS, createTile } from "@/lib/game/tiles";
import type { Board, GameState, Position, TileColor } from "@/lib/game/types";
import {
  createDefaultProgress,
  loadProgress,
  saveProgress,
  type Progress
} from "@/lib/storage";

const BOARD_SIZE = 8;

const colorMap: Record<TileColor, string> = {
  R: "#ef4444",
  G: "#22c55e",
  B: "#3b82f6",
  Y: "#facc15",
  P: "#a855f7"
};

const createBoard = (): Board => {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => {
      const color = TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)];
      return createTile(color);
    })
  );
};

const createInitialState = (level: Level): GameState => {
  return {
    board: createBoard(),
    score: 0,
    movesLeft: level.movesLimit,
    status: "playing"
  };
};

const isAdjacent = (first: Position, second: Position): boolean => {
  const rowDiff = Math.abs(first.row - second.row);
  const colDiff = Math.abs(first.col - second.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

export default function HomePage() {
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTile, setSelectedTile] = useState<Position | null>(null);
  const [progress, setProgress] = useState<Progress>(() =>
    createDefaultProgress(levels)
  );

  useEffect(() => {
    const storedProgress = loadProgress(levels);
    setProgress(storedProgress);
  }, []);

  const currentLevel = useMemo(() => {
    if (!selectedLevelId) {
      return null;
    }
    return levels.find((level) => level.id === selectedLevelId) ?? null;
  }, [selectedLevelId]);

  const startLevel = (level: Level) => {
    setSelectedLevelId(level.id);
    setGameState(createInitialState(level));
    setSelectedTile(null);
  };

  const handleBackToLevels = () => {
    setSelectedLevelId(null);
    setGameState(null);
    setSelectedTile(null);
  };

  const handleRetry = () => {
    if (!currentLevel) {
      return;
    }
    setGameState(createInitialState(currentLevel));
    setSelectedTile(null);
  };

  const applyClearProgress = (level: Level, finalScore: number) => {
    const existingBest = progress.bestScores[level.id];
    const bestScore = existingBest ? Math.max(existingBest, finalScore) : finalScore;
    const levelIndex = levels.findIndex((item) => item.id === level.id);
    const nextLevel = levels[levelIndex + 1];
    const unlockedLevelIds = progress.unlockedLevelIds.slice();

    if (!unlockedLevelIds.includes(level.id)) {
      unlockedLevelIds.push(level.id);
    }
    if (nextLevel && !unlockedLevelIds.includes(nextLevel.id)) {
      unlockedLevelIds.push(nextLevel.id);
    }

    const nextProgress: Progress = {
      unlockedLevelIds,
      bestScores: {
        ...progress.bestScores,
        [level.id]: bestScore
      }
    };

    setProgress(nextProgress);
    saveProgress(nextProgress);
  };

  const handleTileClick = (row: number, col: number) => {
    if (!gameState || !currentLevel) {
      return;
    }
    if (gameState.status !== "playing") {
      return;
    }

    const nextPosition: Position = { row, col };

    if (!selectedTile) {
      setSelectedTile(nextPosition);
      return;
    }

    if (selectedTile.row === row && selectedTile.col === col) {
      setSelectedTile(null);
      return;
    }

    if (!isAdjacent(selectedTile, nextPosition)) {
      setSelectedTile(nextPosition);
      return;
    }

    const swappedBoard = swapTiles(gameState.board, selectedTile, nextPosition);
    const { positions } = findMatches(swappedBoard);
    if (positions.length === 0) {
      setSelectedTile(null);
      return;
    }

    const resolved = resolveBoard(swappedBoard);
    const nextScore = gameState.score + resolved.removedTiles * 10;
    const nextMovesLeft = gameState.movesLeft - 1;
    let nextStatus: GameState["status"] = "playing";

    if (checkClearCondition(nextScore, currentLevel.targetScore)) {
      nextStatus = "clear";
    } else if (nextMovesLeft <= 0) {
      nextStatus = "fail";
    }

    const nextState: GameState = {
      board: resolved.board,
      score: nextScore,
      movesLeft: nextMovesLeft,
      status: nextStatus
    };

    setGameState(nextState);
    setSelectedTile(null);

    if (nextStatus === "clear") {
      const finalScore = nextScore + nextMovesLeft * 50;
      applyClearProgress(currentLevel, finalScore);
    }
  };

  const bestScore = currentLevel ? progress.bestScores[currentLevel.id] : undefined;
  const finalScore = gameState
    ? gameState.score + Math.max(gameState.movesLeft, 0) * 50
    : 0;

  return (
    <main className="page">
      <div className="panel">
        <header className="header">
          <h1>Codex Match</h1>
          <p>Match 3 tiles to score points and hit the target before moves run out.</p>
        </header>

        {!currentLevel && (
          <section className="level-select">
            <h2>Level Select</h2>
            <div className="level-grid">
              {levels.map((level) => {
                const isUnlocked = progress.unlockedLevelIds.includes(level.id);
                const levelBest = progress.bestScores[level.id];
                return (
                  <button
                    key={level.id}
                    className="level-card"
                    onClick={() => startLevel(level)}
                    disabled={!isUnlocked}
                  >
                    <div className="level-name">{level.name}</div>
                    <div className="level-meta">Target: {level.targetScore}</div>
                    <div className="level-meta">Moves: {level.movesLimit}</div>
                    <div className="level-meta">
                      Best: {levelBest ? levelBest : "-"}
                    </div>
                    {!isUnlocked && <span className="level-locked">Locked</span>}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {currentLevel && gameState && (
          <section className="game">
            <div className="game-header">
              <div>
                <h2>{currentLevel.name}</h2>
                <p className="target">
                  Target Score: {currentLevel.targetScore}
                </p>
                {bestScore !== undefined && (
                  <p className="target">Best Score: {bestScore}</p>
                )}
              </div>
              <div className="stats">
                <div className="stat">
                  <span>Score</span>
                  <strong>{gameState.score}</strong>
                </div>
                <div className="stat">
                  <span>Moves Left</span>
                  <strong>{gameState.movesLeft}</strong>
                </div>
              </div>
            </div>

            <div className="board" role="grid">
              {gameState.board.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className="board-row" role="row">
                  {row.map((tile, colIndex) => {
                    const isSelected =
                      selectedTile?.row === rowIndex && selectedTile?.col === colIndex;
                    return (
                      <button
                        key={tile.id}
                        className={`tile ${isSelected ? "selected" : ""}`}
                        style={{ backgroundColor: colorMap[tile.color] }}
                        onClick={() => handleTileClick(rowIndex, colIndex)}
                        type="button"
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="actions">
              <button className="secondary" onClick={handleRetry} type="button">
                Retry
              </button>
              <button className="secondary" onClick={handleBackToLevels} type="button">
                Back to Levels
              </button>
            </div>

            {(gameState.status === "clear" || gameState.status === "fail") && (
              <div className="modal" role="dialog" aria-modal="true">
                <div className="modal-content">
                  <h3>
                    {gameState.status === "clear" ? "Level Clear!" : "Level Failed"}
                  </h3>
                  <p>Score: {gameState.score}</p>
                  {gameState.status === "clear" && (
                    <p>Final Score: {finalScore}</p>
                  )}
                  <div className="modal-actions">
                    <button onClick={handleRetry} type="button">
                      Retry
                    </button>
                    <button onClick={handleBackToLevels} type="button">
                      Back
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
