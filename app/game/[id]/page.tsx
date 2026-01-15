"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BoardView from "../../../components/BoardView";
import SettingsModal from "../../../components/SettingsModal";
import TutorialOverlay from "../../../components/TutorialOverlay";
import { createBoard, performSwap, resolveBoard } from "../../../lib/game/engine";
import { LevelDefinition, Objective } from "../../../lib/game/types";
import { playSound, triggerHaptic } from "../../../lib/game/sound";
import { loadLevels } from "../../../lib/storage/levels";
import { loadSettings, saveSettings } from "../../../lib/storage/settings";
import { loadFromStorage, saveToStorage } from "../../../lib/storage/localStorage";

const tutorialKey = "tutorialCompleted";

const isAdjacent = (a: { row: number; col: number }, b: { row: number; col: number }) =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

const objectiveLabel = (objective: Objective) => {
  if (objective.type === "score") {
    return `Score ${objective.target.score ?? 0}`;
  }
  if (objective.type === "collect") {
    return `Collect ${objective.target.color ?? ""}`;
  }
  return `Clear ${objective.target.blockType ?? ""}`;
};

export default function GamePage({ params }: { params: { id: string } }) {
  const [level, setLevel] = useState<LevelDefinition | null>(null);
  const [boardState, setBoardState] = useState(() =>
    createBoard(8, 8, ["R", "G", "B", "Y", "P"])
  );
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [movesLeft, setMovesLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [objectiveState, setObjectiveState] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState(loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [showResult, setShowResult] = useState<"win" | "lose" | null>(null);
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [tutorialEnabled, setTutorialEnabled] = useState(false);

  useEffect(() => {
    const levels = loadLevels();
    const current = levels.find((item) => item.id === params.id) ?? levels[0];
    if (!current) return;
    setLevel(current);
    const overlays = { ice: [] as string[], jelly: [] as string[] };
    current.specialBlocks?.forEach((block) => {
      overlays[block.type].push(...block.cells);
    });
    const newBoard = createBoard(
      current.board.rows,
      current.board.cols,
      current.board.tileTypes,
      current.board.blockedCells,
      overlays
    );
    const resolved = resolveBoard(newBoard, current.board.tileTypes);
    setBoardState(resolved.board);
    setMovesLeft(current.movesLimit);
    setScore(0);
    setCombo(0);
    setObjectiveState({});
    const tutorialDone = loadFromStorage<boolean>(tutorialKey, false);
    setTutorialEnabled(Boolean(current.tutorial?.enabled) && !tutorialDone);
    setTutorialIndex(0);
  }, [params.id]);

  const progress = useMemo(() => {
    if (!level) return [] as string[];
    return level.objectives.map((objective) => {
      const key = objectiveLabel(objective);
      const currentValue = objectiveState[key] ?? 0;
      if (objective.type === "score") {
        return `${key}: ${score}/${objective.target.score}`;
      }
      return `${key}: ${currentValue}/${objective.target.count ?? 0}`;
    });
  }, [level, objectiveState, score]);

  const computeObjectiveState = (
    prev: Record<string, number>,
    clearedColors: string[],
    clearedBlocks: { ice: number; jelly: number }
  ) => {
    if (!level) return prev;
    const next = { ...prev };
    level.objectives.forEach((objective) => {
      const key = objectiveLabel(objective);
      if (objective.type === "collect" && objective.target.color) {
        const count = clearedColors.filter((color) => color === objective.target.color).length;
        next[key] = (next[key] ?? 0) + count;
      }
      if (objective.type === "clear" && objective.target.blockType) {
        const cleared = clearedBlocks[objective.target.blockType];
        next[key] = (next[key] ?? 0) + cleared;
      }
    });
    return next;
  };

  const checkWin = (nextScore: number, state: Record<string, number>) => {
    if (!level) return false;
    return level.objectives.every((objective) => {
      if (objective.type === "score") {
        return nextScore >= (objective.target.score ?? 0);
      }
      const key = objectiveLabel(objective);
      return (state[key] ?? 0) >= (objective.target.count ?? 0);
    });
  };

  const handleSwap = (row: number, col: number) => {
    if (!level || showResult) return;
    if (!selected) {
      setSelected({ row, col });
      return;
    }
    if (selected.row === row && selected.col === col) {
      setSelected(null);
      return;
    }
    if (!isAdjacent(selected, { row, col })) {
      setSelected({ row, col });
      return;
    }
    const swapResult = performSwap(boardState, selected, { row, col }, level.board.tileTypes);
    if (swapResult.score === 0) {
      playSound("fail", settings.soundOn);
      setSelected(null);
      return;
    }
    const chainResult = resolveBoard(swapResult.board, level.board.tileTypes);
    const totalScore = swapResult.score + chainResult.score + combo * 20;
    const clearedColors = swapResult.cleared.map((cell) => boardState.tiles[cell.row][cell.col].color);
    const clearedBlocks = swapResult.cleared.reduce(
      (acc, cell) => {
        const overlay = boardState.overlays[cell.row][cell.col];
        if (overlay.ice) acc.ice += 1;
        if (overlay.jelly) acc.jelly += 1;
        return acc;
      },
      { ice: 0, jelly: 0 }
    );

    setBoardState(chainResult.board);
    setMovesLeft((prev) => prev - 1);
    setScore((prev) => prev + totalScore);
    setCombo((prev) => prev + 1);
    playSound("match", settings.soundOn);
    if (swapResult.createdSpecial || swapResult.specialTriggered) {
      playSound("special", settings.soundOn);
      triggerHaptic(settings.hapticOn, [40]);
    }

    setSelected(null);

    setObjectiveState((prev) => {
      const updated = computeObjectiveState(prev, clearedColors, clearedBlocks);
      const win = checkWin(score + totalScore, updated);
      if (win) {
        const bonus = movesLeft * 15;
        setScore((prevScore) => prevScore + bonus);
        setShowResult("win");
        playSound("clear", settings.soundOn);
        triggerHaptic(settings.hapticOn, [60, 40, 60]);
      } else if (movesLeft - 1 <= 0) {
        setShowResult("lose");
        playSound("fail", settings.soundOn);
      }
      return updated;
    });
  };

  const tutorialStep = level?.tutorial?.steps?.[tutorialIndex];

  const highlightCell = tutorialStep?.type === "swapHint" ? tutorialStep.cell : undefined;
  const highlightHud = tutorialStep?.type === "highlightHud";
  const highlightBoard = tutorialStep?.type === "highlightBoard";

  const handleTutorialNext = () => {
    if (!level?.tutorial) return;
    const nextIndex = tutorialIndex + 1;
    if (nextIndex >= level.tutorial.steps.length) {
      setTutorialEnabled(false);
      saveToStorage(tutorialKey, true);
    } else {
      setTutorialIndex(nextIndex);
    }
  };

  const handleSettingsChange = (nextSettings: typeof settings) => {
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  if (!level) {
    return null;
  }

  return (
    <main>
      <div className="container">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>{level.name}</h1>
            <p style={{ margin: 0, color: "#94a3b8" }}>{level.notes}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="button secondary" onClick={() => setShowSettings(true)}>
              Settings
            </button>
            <Link className="button secondary" href="/levels">
              Back
            </Link>
          </div>
        </header>

        <section className={`hud ${highlightHud ? "highlight" : ""}`} style={{ margin: "24px 0" }}>
          <div className="card">
            <p style={{ margin: 0, fontWeight: 600 }}>Moves Left</p>
            <h2 style={{ margin: "8px 0 0" }}>{movesLeft}</h2>
          </div>
          <div className="card">
            <p style={{ margin: 0, fontWeight: 600 }}>Score</p>
            <h2 style={{ margin: "8px 0 0" }}>{score}</h2>
            <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>Combo x{combo}</p>
          </div>
          <div className="card" style={{ gridColumn: "span 2" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Objectives</p>
            <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
              {progress.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <div className={highlightBoard ? "highlight" : ""} style={{ display: "inline-block" }}>
          <BoardView board={boardState} selected={selected} onSelect={handleSwap} highlightCell={highlightCell} />
        </div>
      </div>

      {tutorialEnabled && level.tutorial && (
        <TutorialOverlay steps={level.tutorial.steps} stepIndex={tutorialIndex} onNext={handleTutorialNext} />
      )}

      {showResult && (
        <div className="overlay">
          <div className="modal" style={{ textAlign: "center" }}>
            <h2>{showResult === "win" ? "Level Clear!" : "Try Again"}</h2>
            <p>Score: {score}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Link className="button" href="/levels">
                Level Select
              </Link>
              <button className="button secondary" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        open={showSettings}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onChange={handleSettingsChange}
      />
    </main>
  );
}
