"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Level } from "@/data/levels";
import {
  checkClearCondition,
  createInitialBoard,
  findMatches,
  resolveBoard,
  swapTiles,
} from "@/lib/game/logic";
import type { GameState, Position } from "@/lib/game/types";
import {
  getDefaultProgress,
  loadProgress,
  saveProgress,
  unlockNextLevel,
  updateBestScore,
} from "@/lib/storage/progress";

const SCORE_PER_TILE = 10;
const CLEAR_BONUS_PER_MOVE = 50;

const formatScore = (score: number) => score.toLocaleString();

function isAdjacent(a: Position, b: Position): boolean {
  const rowDiff = Math.abs(a.row - b.row);
  const colDiff = Math.abs(a.col - b.col);
  return rowDiff + colDiff === 1;
}

export default function GameClient({ level, levels }: { level: Level; levels: Level[] }) {
  const [state, setState] = useState<GameState>(() => ({
    board: createInitialBoard(),
    score: 0,
    movesLeft: level.movesLimit,
    status: "playing",
  }));
  const [selected, setSelected] = useState<Position | null>(null);
  const [progress, setProgress] = useState(() => getDefaultProgress(levels));
  const previousStatus = useRef<GameState["status"]>(state.status);

  useEffect(() => {
    setProgress(loadProgress(levels));
  }, [levels]);

  useEffect(() => {
    if (state.status === "clear" && previousStatus.current !== "clear") {
      const finalScore = state.score + state.movesLeft * CLEAR_BONUS_PER_MOVE;
      let nextProgress = updateBestScore(progress, level.id, finalScore);
      nextProgress = unlockNextLevel(levels, level.id, nextProgress);
      setProgress(nextProgress);
      saveProgress(nextProgress);
    }
    previousStatus.current = state.status;
  }, [state.status, state.movesLeft, state.score, level.id, levels, progress]);

  const finalScore = useMemo(() => {
    if (state.status !== "clear") {
      return state.score;
    }
    return state.score + state.movesLeft * CLEAR_BONUS_PER_MOVE;
  }, [state.movesLeft, state.score, state.status]);

  const isUnlocked = progress.unlockedLevelIds.includes(level.id);

  const handleTileClick = (row: number, col: number) => {
    if (state.status !== "playing") {
      return;
    }
    if (!isUnlocked) {
      return;
    }

    const nextSelection = { row, col };
    if (!selected) {
      setSelected(nextSelection);
      return;
    }

    if (selected.row === row && selected.col === col) {
      setSelected(null);
      return;
    }

    if (!isAdjacent(selected, nextSelection)) {
      setSelected(nextSelection);
      return;
    }

    const swapped = swapTiles(state.board, selected, nextSelection);
    const matches = findMatches(swapped);
    if (matches.length === 0) {
      setSelected(null);
      return;
    }

    const resolved = resolveBoard(swapped);
    const updatedScore = state.score + resolved.matchedCount * SCORE_PER_TILE;
    const updatedMoves = state.movesLeft - 1;
    const cleared = checkClearCondition(updatedScore, level.targetScore);
    const status = cleared ? "clear" : updatedMoves <= 0 ? "fail" : "playing";

    setState({
      board: resolved.board,
      score: updatedScore,
      movesLeft: updatedMoves,
      status,
    });
    setSelected(null);
  };

  const resetGame = () => {
    setState({
      board: createInitialBoard(),
      score: 0,
      movesLeft: level.movesLimit,
      status: "playing",
    });
    setSelected(null);
  };

  return (
    <main>
      <header className="header">
        <h1>{level.name}</h1>
        <p>Reach {formatScore(level.targetScore)} points in {level.movesLimit} moves.</p>
      </header>

      {!isUnlocked ? (
        <div className="panel">
          <p>This level is locked. Clear previous levels to unlock it.</p>
          <Link className="button" href="/">
            Back to Levels
          </Link>
        </div>
      ) : (
        <section className="game-layout">
          <div className="panel">
            <div className="stat">
              <span>Score</span>
              <strong>{formatScore(state.score)}</strong>
            </div>
            <div className="stat">
              <span>Moves Left</span>
              <strong>{state.movesLeft}</strong>
            </div>
            <div className="stat">
              <span>Target</span>
              <strong>{formatScore(level.targetScore)}</strong>
            </div>
            <div className="stat">
              <span>Status</span>
              <strong>{state.status === "playing" ? "Playing" : state.status}</strong>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button className="button" type="button" onClick={resetGame}>
                Retry
              </button>
              <Link className="button secondary" href="/">
                Back
              </Link>
            </div>
          </div>

          <div className="board" role="grid" aria-label="Game board">
            {state.board.map((rowTiles, rowIndex) =>
              rowTiles.map((tile, colIndex) => {
                const isSelected =
                  selected?.row === rowIndex && selected?.col === colIndex;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={`tile ${tile.color}${isSelected ? " selected" : ""}`}
                    onClick={() => handleTileClick(rowIndex, colIndex)}
                    aria-pressed={isSelected}
                  />
                );
              })
            )}
          </div>
        </section>
      )}

      {state.status !== "playing" && isUnlocked ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>{state.status === "clear" ? "Level Clear!" : "Level Failed"}</h2>
            {state.status === "clear" ? (
              <div>
                <p>Score: {formatScore(state.score)}</p>
                <p>Moves Bonus: {state.movesLeft * CLEAR_BONUS_PER_MOVE}</p>
                <p>
                  Final Score: <strong>{formatScore(finalScore)}</strong>
                </p>
              </div>
            ) : (
              <p>Try again to reach the target score.</p>
            )}
            <div className="modal-actions">
              <button className="button" type="button" onClick={resetGame}>
                Retry
              </button>
              <Link className="button secondary" href="/">
                Back
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
