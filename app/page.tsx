'use client';

import { useEffect, useMemo, useState } from 'react';
import { defaultLevels } from '../lib/data/levels';
import { createBoard, swapAndResolve } from '../lib/game/logic';
import type { Cell, LevelData, Objective } from '../lib/game/types';
import { GameBoard } from '../components/GameBoard';
import { Hud } from '../components/Hud';
import { LevelEditor } from '../components/LevelEditor';
import { SettingsModal } from '../components/SettingsModal';
import { ResultModal } from '../components/ResultModal';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { useSound } from '../lib/hooks/useSound';

const buildSpecialGrid = (level: LevelData): Cell[][] => {
  const grid: Cell[][] = Array.from({ length: level.board.rows }, () =>
    Array.from({ length: level.board.cols }, () => ({ tile: null }))
  );
  level.specialBlocks?.forEach((block) => {
    block.cells.forEach((cell) => {
      const [r, c] = cell.split(',').map(Number);
      if (!grid[r]?.[c]) return;
      if (block.type === 'ice') grid[r][c].ice = true;
      if (block.type === 'jelly') grid[r][c].jelly = true;
    });
  });
  return grid;
};

const objectiveKey = (objective: Objective, index: number) =>
  `${objective.type}-${objective.target.color ?? ''}-${objective.target.block ?? ''}-${index}`;

const initProgress = (objectives: Objective[]) =>
  objectives.reduce<Record<string, number>>((acc, obj, idx) => {
    acc[objectiveKey(obj, idx)] = 0;
    return acc;
  }, {});

export default function Home() {
  const [view, setView] = useState<'home' | 'game' | 'editor'>('home');
  const [levels, setLevels] = useState<LevelData[]>(defaultLevels);
  const [activeLevelId, setActiveLevelId] = useState<string>(defaultLevels[0]?.id ?? '');
  const [board, setBoard] = useState<Cell[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [movesLeft, setMovesLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [resultOpen, setResultOpen] = useState(false);
  const [resultSuccess, setResultSuccess] = useState(false);
  const [resultBonus, setResultBonus] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [vibrationOn, setVibrationOn] = useState(true);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);

  const { playSound } = useSound(soundOn);

  const activeLevel = useMemo(
    () => levels.find((level) => level.id === activeLevelId) ?? levels[0],
    [levels, activeLevelId]
  );

  useEffect(() => {
    const stored = localStorage.getItem('levels-v2');
    if (stored) {
      try {
        setLevels(JSON.parse(stored));
      } catch {
        setLevels(defaultLevels);
      }
    }
    const settings = localStorage.getItem('settings-v2');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        setSoundOn(parsed.soundOn ?? true);
        setVibrationOn(parsed.vibrationOn ?? true);
      } catch {
        // ignore
      }
    }
    setTutorialCompleted(localStorage.getItem('tutorialCompleted') === 'true');
  }, []);

  const saveLevels = (next: LevelData[]) => {
    setLevels(next);
    localStorage.setItem('levels-v2', JSON.stringify(next));
  };

  const saveSettings = (next: { soundOn: boolean; vibrationOn: boolean }) => {
    localStorage.setItem('settings-v2', JSON.stringify(next));
  };

  const startLevel = (levelId: string) => {
    const level = levels.find((item) => item.id === levelId) ?? levels[0];
    if (!level) return;
    const base = buildSpecialGrid(level);
    const newBoard = createBoard(level.board, base);
    setBoard(newBoard);
    setActiveLevelId(level.id);
    setMovesLeft(level.movesLimit);
    setScore(0);
    setProgress(initProgress(level.objectives));
    setSelected(null);
    setResultOpen(false);
    setResultSuccess(false);
    setResultBonus(0);
    setTutorialStepIndex(0);
    setView('game');
  };

  const evaluateResult = (nextScore: number, nextMoves: number, nextProgress: Record<string, number>) => {
    if (!activeLevel) return;
    const allCompleted = activeLevel.objectives.every((objective, idx) => {
      const key = objectiveKey(objective, idx);
      const current = nextProgress[key] ?? 0;
      if (objective.type === 'score') return nextScore >= (objective.target.score ?? 0);
      if (objective.type === 'collect') return current >= (objective.target.count ?? 0);
      if (objective.type === 'clear') return current >= (objective.target.count ?? 0);
      return false;
    });

    if (allCompleted || nextMoves <= 0) {
      const bonus = allCompleted ? nextMoves * 50 : 0;
      setResultBonus(bonus);
      setResultSuccess(allCompleted);
      setResultOpen(true);
      if (allCompleted && bonus > 0) {
        setScore(nextScore + bonus);
      }
      if (allCompleted) {
        playSound('clear');
        if (vibrationOn && navigator.vibrate) navigator.vibrate([80, 40, 80]);
      } else {
        playSound('fail');
      }
    }
  };

  const handleSwap = (pos: [number, number]) => {
    if (!activeLevel || resultOpen) return;
    if (!selected) {
      setSelected(pos);
      return;
    }
    const [r, c] = pos;
    const [sr, sc] = selected;
    if (r === sr && c === sc) {
      setSelected(null);
      return;
    }
    const result = swapAndResolve(board, activeLevel.board, selected, pos);
    if (!result.swapped) {
      setSelected(null);
      return;
    }
    playSound('match');
    if (vibrationOn && navigator.vibrate) navigator.vibrate(40);

    let comboBonus = 0;
    result.cascades.forEach((cascade, index) => {
      comboBonus += cascade.scoreDelta * (1 + index * 0.5);
      comboBonus += cascade.clearedTiles.filter((tile) => tile.special).length * 30;
    });

    const nextScore = score + Math.floor(comboBonus);
    const nextMoves = movesLeft - 1;
    setBoard(result.board);
    setMovesLeft(nextMoves);
    setScore(nextScore);
    const nextProgress = { ...progress };
    result.cascades.forEach((cascade) => {
      activeLevel.objectives.forEach((objective, idx) => {
        const key = objectiveKey(objective, idx);
        if (objective.type === 'collect' && objective.target.color) {
          const count = cascade.clearedTiles.filter((tile) => tile.color === objective.target.color).length;
          nextProgress[key] = (nextProgress[key] ?? 0) + count;
        }
        if (objective.type === 'clear' && objective.target.block) {
          const blockCount = objective.target.block === 'ice' ? cascade.clearedBlocks.ice : cascade.clearedBlocks.jelly;
          nextProgress[key] = (nextProgress[key] ?? 0) + blockCount;
        }
        if (objective.type === 'score') {
          nextProgress[key] = nextScore;
        }
      });
    });
    setProgress(nextProgress);
    setSelected(null);

    if (result.cascades.length > 1) playSound('special');

    evaluateResult(nextScore, nextMoves, nextProgress);
  };

  const tutorialStep = activeLevel?.tutorial?.enabled && !tutorialCompleted ? activeLevel.tutorial.steps[tutorialStepIndex] ?? null : null;
  const highlightObjectives = tutorialStep?.type === 'highlightObjective';

  const advanceTutorial = () => {
    if (!activeLevel?.tutorial?.steps) return;
    if (tutorialStepIndex + 1 >= activeLevel.tutorial.steps.length) {
      setTutorialCompleted(true);
      localStorage.setItem('tutorialCompleted', 'true');
    } else {
      setTutorialStepIndex((prev) => prev + 1);
    }
  };

  const resetLevel = () => {
    startLevel(activeLevelId);
  };

  const exitLevel = () => {
    setView('home');
    setResultOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>3-Match Puzzle</h2>
        <button className={`nav-button ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
          Home
        </button>
        <button className={`nav-button ${view === 'game' ? 'active' : ''}`} onClick={() => startLevel(activeLevelId)}>
          Play
        </button>
        <button className={`nav-button ${view === 'editor' ? 'active' : ''}`} onClick={() => setView('editor')}>
          Level Editor
        </button>
        <button className="nav-button" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
        <div className="card">
          <h4>Active Level</h4>
          <p>{activeLevel?.name}</p>
          <p>Moves: {activeLevel?.movesLimit}</p>
        </div>
      </aside>

      <main className="main">
        {view === 'home' && (
          <div className="card">
            <h2>Level Select</h2>
            <div className="row">
              {levels.map((level) => (
                <button
                  key={level.id}
                  className={`nav-button ${activeLevelId === level.id ? 'active' : ''}`}
                  onClick={() => setActiveLevelId(level.id)}
                >
                  {level.name}
                </button>
              ))}
            </div>
            <button className="nav-button" style={{ marginTop: 12 }} onClick={() => startLevel(activeLevelId)}>
              Start Level
            </button>
          </div>
        )}

        {view === 'game' && activeLevel && board.length > 0 && (
          <div className="card" style={{ position: 'relative' }}>
            <Hud
              movesLeft={movesLeft}
              score={score}
              objectives={activeLevel.objectives}
              progress={progress}
              highlightObjectives={highlightObjectives}
            />
            <GameBoard board={board} selected={selected} onSelect={handleSwap} disabled={resultOpen} />
            <TutorialOverlay step={tutorialStep ?? null} onNext={advanceTutorial} />
          </div>
        )}

        {view === 'editor' && (
          <LevelEditor levels={levels} onSave={saveLevels} onTestPlay={startLevel} />
        )}
      </main>

      <SettingsModal
        open={settingsOpen}
        soundOn={soundOn}
        vibrationOn={vibrationOn}
        onClose={() => setSettingsOpen(false)}
        onToggleSound={(value) => {
          setSoundOn(value);
          saveSettings({ soundOn: value, vibrationOn });
        }}
        onToggleVibration={(value) => {
          setVibrationOn(value);
          saveSettings({ soundOn, vibrationOn: value });
        }}
      />

      <ResultModal
        open={resultOpen}
        success={resultSuccess}
        score={score}
        bonus={resultBonus}
        onRestart={resetLevel}
        onExit={exitLevel}
      />
    </div>
  );
}
