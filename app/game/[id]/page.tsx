'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { buildBoard, resolveCascade, resolveSpecialCombo, swapTiles } from '../../../lib/game/engine';
import { BoardState, LevelDefinition, Objective, Tile, TileColor } from '../../../lib/game/types';
import { isTutorialCompleted, loadLevels, loadSettings, saveSettings, setTutorialCompleted } from '../../../lib/storage';
import { playSound, triggerHaptic } from '../../../lib/sound';
import ResultModal from '../../../components/ResultModal';
import SettingsModal from '../../../components/SettingsModal';
import TutorialOverlay from '../../../components/TutorialOverlay';

type ObjectiveProgress = Objective & {
  current: number;
  completed: boolean;
};

const colorMap: Record<TileColor, string> = {
  R: '#fb7185',
  G: '#4ade80',
  B: '#60a5fa',
  Y: '#facc15',
  P: '#c084fc'
};

const specialLabel = (tile?: Tile | null) => {
  if (!tile?.special) return '';
  if (tile.special === 'lineH') return '—';
  if (tile.special === 'lineV') return '|';
  if (tile.special === 'bomb') return '💥';
  return '★';
};

const isAdjacent = (a: { row: number; col: number }, b: { row: number; col: number }) =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

export default function GamePage({ params }: { params: { id: string } }) {
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [level, setLevel] = useState<LevelDefinition | null>(null);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [movesLeft, setMovesLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState<ObjectiveProgress[]>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultSuccess, setResultSuccess] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [vibrationOn, setVibrationOn] = useState(true);

  useEffect(() => {
    const stored = loadLevels();
    setLevels(stored);
    const current = stored.find((entry) => entry.id === params.id) ?? null;
    setLevel(current);
    if (current) {
      const built = buildBoard(current);
      setBoard(built);
      setMovesLeft(current.movesLimit);
      setScore(0);
      setProgress(
        current.objectives.map((objective) => ({
          ...objective,
          current: 0,
          completed: false
        }))
      );
      const shouldShowTutorial = current.tutorial?.enabled && !isTutorialCompleted();
      setTutorialOpen(Boolean(shouldShowTutorial));
      setTutorialStep(0);
    }
    const storedSettings = loadSettings();
    setSoundOn(storedSettings.soundOn);
    setVibrationOn(storedSettings.vibrationOn);
  }, [params.id]);

  useEffect(() => {
    if (!resultOpen) return;
    if (resultSuccess) {
      playSound('clear', soundOn);
      triggerHaptic([120, 40, 120], vibrationOn);
    } else {
      playSound('fail', soundOn);
    }
  }, [resultOpen, resultSuccess, soundOn, vibrationOn]);

  const objectiveSummary = useMemo(() => {
    if (!level) return [];
    return progress.map((objective) => {
      if (objective.type === 'score') {
        const target = objective.target.score as number;
        return `점수 ${objective.current}/${target}`;
      }
      if (objective.type === 'collect') {
        const color = objective.target.color as string;
        const count = objective.target.count as number;
        return `${color} ${objective.current}/${count}`;
      }
      if (objective.type === 'clear') {
        const count = objective.target.count as number;
        return `레이어 ${objective.current}/${count}`;
      }
      if (objective.type === 'bring') {
        const count = objective.target.count as number;
        return `하단 ${objective.current}/${count}`;
      }
      return '';
    });
  }, [progress, level]);

  const updateObjectives = (removed: { tile: Tile }[], clearedLayers: number, gainedScore: number) => {
    setProgress((prev) =>
      prev.map((objective) => {
        if (objective.type === 'score') {
          const target = objective.target.score as number;
          const current = score + gainedScore;
          return { ...objective, current, completed: current >= target };
        }
        if (objective.type === 'collect') {
          const target = objective.target.count as number;
          const color = objective.target.color as TileColor;
          const matched = removed.filter((item) => item.tile.color === color).length;
          const current = objective.current + matched;
          return { ...objective, current, completed: current >= target };
        }
        if (objective.type === 'clear') {
          const target = objective.target.count as number;
          const current = objective.current + clearedLayers;
          return { ...objective, current, completed: current >= target };
        }
        return objective;
      })
    );
  };

  const checkWinLose = (nextMoves: number) => {
    const allDone = progress.every((objective) => objective.completed);
    if (allDone) {
      const bonus = nextMoves * 30;
      setScore((prev) => prev + bonus);
      setResultSuccess(true);
      setResultOpen(true);
      return true;
    }
    if (nextMoves <= 0) {
      setResultSuccess(false);
      setResultOpen(true);
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (resultOpen) return;
    checkWinLose(movesLeft);
  }, [movesLeft, progress, resultOpen]);

  const handleSwap = (target: { row: number; col: number }) => {
    if (!board || !level || resultOpen || tutorialOpen) return;
    if (!selected) {
      setSelected(target);
      return;
    }
    if (selected.row === target.row && selected.col === target.col) {
      setSelected(null);
      return;
    }
    if (!isAdjacent(selected, target)) {
      setSelected(target);
      return;
    }

    const swapped = swapTiles(board, selected, target);
    const comboResult = resolveSpecialCombo(swapped, selected, target);
    const result = comboResult ?? resolveCascade(swapped, [selected, target]);

    if (!result) {
      setSelected(null);
      return;
    }

    const nextMoves = movesLeft - 1;
    setMovesLeft(nextMoves);
    setBoard(result.board);
    setSelected(null);
    setScore((prev) => prev + result.scoreGained);
    updateObjectives(result.removed, result.clearedLayers, result.scoreGained);

    if (result.specialsCreated.length > 0) {
      playSound('special', soundOn);
    } else {
      playSound('match', soundOn);
    }
    if (comboResult) {
      playSound('explosion', soundOn);
      triggerHaptic(80, vibrationOn);
    }

  };

  const handleRetry = () => {
    if (!level) return;
    const built = buildBoard(level);
    setBoard(built);
    setMovesLeft(level.movesLimit);
    setScore(0);
    setProgress(
      level.objectives.map((objective) => ({
        ...objective,
        current: 0,
        completed: false
      }))
    );
    setResultOpen(false);
    setResultSuccess(false);
  };

  const handleTutorialNext = () => {
    if (!level?.tutorial) return;
    if (tutorialStep + 1 >= level.tutorial.steps.length) {
      setTutorialOpen(false);
      setTutorialCompleted();
      return;
    }
    setTutorialStep((prev) => prev + 1);
  };

  if (!level || !board) {
    return (
      <main>
        <p>레벨을 불러오는 중...</p>
      </main>
    );
  }

  return (
    <main>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <section className="panel" style={{ flex: '1 1 280px', minWidth: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="badge">Lv {level.id.replace('level-', '')}</span>
              <h2 style={{ margin: '8px 0' }}>{level.name}</h2>
            </div>
            <button className="button-secondary" onClick={() => setSettingsOpen(true)}>
              설정
            </button>
          </div>
          <div className="grid" style={{ marginTop: 16 }}>
            <div className={clsx('panel', tutorialOpen && level.tutorial?.steps[tutorialStep]?.type === 'highlightObjective' && 'tutorial-highlight')}>
              <strong>목표</strong>
              <ul style={{ paddingLeft: 18, color: 'var(--muted)' }}>
                {objectiveSummary.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="panel">
              <strong>Moves</strong>
              <p style={{ fontSize: 24, margin: '6px 0' }}>{movesLeft}</p>
              <strong>Score</strong>
              <p style={{ fontSize: 24, margin: '6px 0' }}>{score}</p>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <Link className="button-secondary" href="/">
              홈으로
            </Link>
            <button className="button-primary" onClick={handleRetry}>
              다시 시작
            </button>
          </div>
        </section>

        <section className="panel" style={{ flex: '1 1 520px' }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))`,
              justifyItems: 'center'
            }}
          >
            {board.cells.flat().map((cell) => {
              const tile = cell.tile;
              const key = `${cell.row}-${cell.col}`;
              const selectedMatch = selected && selected.row === cell.row && selected.col === cell.col;
              return (
                <button
                  key={key}
                  className={clsx('tile', selectedMatch && 'selected', tile?.special && 'special', cell.layers.includes('ice') && 'ice', cell.layers.includes('jelly') && 'jelly')}
                  style={{ background: tile ? colorMap[tile.color] : '#0b1220', opacity: cell.blocked ? 0.4 : 1 }}
                  onClick={() => handleSwap({ row: cell.row, col: cell.col })}
                  disabled={cell.blocked}
                >
                  {specialLabel(tile)}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <ResultModal
        open={resultOpen}
        success={resultSuccess}
        score={score}
        movesLeft={movesLeft}
        onRetry={handleRetry}
        onExit={() => setResultOpen(false)}
      />
      <SettingsModal
        open={settingsOpen}
        settings={{ soundOn, vibrationOn }}
        onClose={() => setSettingsOpen(false)}
        onUpdate={(next) => {
          setSoundOn(next.soundOn);
          setVibrationOn(next.vibrationOn);
          saveSettings(next);
        }}
      />
      <TutorialOverlay open={tutorialOpen} steps={level.tutorial?.steps ?? []} current={tutorialStep} onNext={handleTutorialNext} />
    </main>
  );
}
