'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { LevelDefinition, Objective, TutorialStep } from '../../lib/game/types';
import { loadLevels, saveLevels } from '../../lib/storage';

type EditTool = 'blocked' | 'ice' | 'jelly' | 'clear';

const emptyLevel = (id: string): LevelDefinition => ({
  id,
  name: `New Level ${id.split('-').pop()}`,
  board: {
    rows: 8,
    cols: 8,
    tileTypes: ['R', 'G', 'B', 'Y', 'P']
  },
  movesLimit: 16,
  parMoves: 12,
  objectives: [{ type: 'score', target: { score: 800 } }]
});

const toggleCellInList = (list: string[] = [], cell: string) =>
  list.includes(cell) ? list.filter((item) => item !== cell) : [...list, cell];

const updateTutorialStep = (steps: TutorialStep[], index: number, value: TutorialStep) =>
  steps.map((step, idx) => (idx === index ? value : step));

export default function EditorPage() {
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tool, setTool] = useState<EditTool>('ice');
  const [jsonBuffer, setJsonBuffer] = useState('');

  useEffect(() => {
    const stored = loadLevels();
    setLevels(stored);
    setActiveId(stored[0]?.id ?? null);
  }, []);

  const activeLevel = useMemo(() => levels.find((level) => level.id === activeId) ?? null, [levels, activeId]);

  const persistLevels = (next: LevelDefinition[]) => {
    setLevels(next);
    saveLevels(next);
  };

  const updateActive = (update: Partial<LevelDefinition>) => {
    if (!activeLevel) return;
    const next = levels.map((level) => (level.id === activeLevel.id ? { ...activeLevel, ...update } : level));
    persistLevels(next);
  };

  const updateBoard = (update: Partial<LevelDefinition['board']>) => {
    if (!activeLevel) return;
    updateActive({ board: { ...activeLevel.board, ...update } });
  };

  const handleToolClick = (cell: string) => {
    if (!activeLevel) return;
    const currentBlocks = activeLevel.specialBlocks ?? [];
    const blockedCells = activeLevel.blockedCells ?? [];
    if (tool === 'blocked') {
      updateActive({ blockedCells: toggleCellInList(blockedCells, cell) });
      return;
    }
    if (tool === 'clear') {
      const nextBlocks = currentBlocks.map((block) => ({
        ...block,
        cells: block.cells.filter((entry) => entry !== cell)
      }));
      updateActive({ specialBlocks: nextBlocks, blockedCells: blockedCells.filter((entry) => entry !== cell) });
      return;
    }

    const blockIndex = currentBlocks.findIndex((block) => block.type === tool);
    if (blockIndex === -1) {
      updateActive({ specialBlocks: [...currentBlocks, { type: tool, cells: [cell] }] });
      return;
    }
    const nextBlocks = currentBlocks.map((block) =>
      block.type === tool ? { ...block, cells: toggleCellInList(block.cells, cell) } : block
    );
    updateActive({ specialBlocks: nextBlocks });
  };

  const updateObjective = (index: number, next: Objective) => {
    if (!activeLevel) return;
    const objectives = activeLevel.objectives.map((objective, idx) => (idx === index ? next : objective));
    updateActive({ objectives });
  };

  const addObjective = () => {
    if (!activeLevel) return;
    updateActive({ objectives: [...activeLevel.objectives, { type: 'collect', target: { color: 'R', count: 8 } }] });
  };

  const removeObjective = (index: number) => {
    if (!activeLevel) return;
    updateActive({ objectives: activeLevel.objectives.filter((_, idx) => idx !== index) });
  };

  const updateTutorial = (steps: TutorialStep[]) => {
    if (!activeLevel) return;
    updateActive({ tutorial: { enabled: true, steps } });
  };

  const addTutorialStep = () => {
    if (!activeLevel) return;
    const steps = activeLevel.tutorial?.steps ?? [];
    updateTutorial([...steps, { type: 'text', message: '튜토리얼 메시지' }]);
  };

  const removeTutorialStep = (index: number) => {
    if (!activeLevel) return;
    const steps = activeLevel.tutorial?.steps ?? [];
    updateTutorial(steps.filter((_, idx) => idx !== index));
  };

  const createLevel = () => {
    const id = `level-${levels.length + 1}`;
    const next = [...levels, emptyLevel(id)];
    persistLevels(next);
    setActiveId(id);
  };

  const duplicateLevel = () => {
    if (!activeLevel) return;
    const id = `level-${levels.length + 1}`;
    const copy = { ...activeLevel, id, name: `${activeLevel.name} Copy` };
    persistLevels([...levels, copy]);
    setActiveId(id);
  };

  const deleteLevel = () => {
    if (!activeLevel) return;
    const next = levels.filter((level) => level.id !== activeLevel.id);
    persistLevels(next);
    setActiveId(next[0]?.id ?? null);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonBuffer) as LevelDefinition[];
      if (Array.isArray(parsed)) {
        persistLevels(parsed);
        setActiveId(parsed[0]?.id ?? null);
      }
    } catch {
      // ignore
    }
  };

  const exportJson = () => {
    setJsonBuffer(JSON.stringify(levels, null, 2));
  };

  if (!activeLevel) {
    return (
      <main>
        <p>레벨 데이터를 불러오는 중...</p>
      </main>
    );
  }

  const { rows, cols } = activeLevel.board;
  const cells = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => `${row},${col}`)
  ).flat();
  const iceCells = activeLevel.specialBlocks?.find((block) => block.type === 'ice')?.cells ?? [];
  const jellyCells = activeLevel.specialBlocks?.find((block) => block.type === 'jelly')?.cells ?? [];
  const blockedCells = activeLevel.blockedCells ?? [];

  return (
    <main>
      <section className="panel" style={{ marginBottom: 20 }}>
        <Link className="button-secondary" href="/">
          홈으로
        </Link>
        <h1 style={{ marginTop: 12 }}>레벨 에디터</h1>
        <p style={{ color: 'var(--muted)' }}>레벨을 편집하고 JSON으로 내보낼 수 있습니다.</p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <section className="panel">
          <h2>레벨 목록</h2>
          <div className="grid" style={{ marginTop: 12 }}>
            {levels.map((level) => (
              <button
                key={level.id}
                className={clsx('button-secondary', level.id === activeId && 'tutorial-highlight')}
                onClick={() => setActiveId(level.id)}
              >
                {level.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <button className="button-primary" onClick={createLevel}>
              새 레벨
            </button>
            <button className="button-secondary" onClick={duplicateLevel}>
              복제
            </button>
            <button className="button-secondary" onClick={deleteLevel}>
              삭제
            </button>
            <Link className="button-secondary" href={`/game/${activeLevel.id}`}>
              Test Play
            </Link>
          </div>
        </section>

        <section className="panel">
          <h2>레벨 설정</h2>
          <label className="grid" style={{ gap: 6, marginTop: 12 }}>
            <span>레벨 이름</span>
            <input value={activeLevel.name} onChange={(event) => updateActive({ name: event.target.value })} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 12 }}>
            <label className="grid" style={{ gap: 6 }}>
              <span>Rows</span>
              <input
                type="number"
                min={5}
                max={10}
                value={activeLevel.board.rows}
                onChange={(event) => updateBoard({ rows: Number(event.target.value) })}
              />
            </label>
            <label className="grid" style={{ gap: 6 }}>
              <span>Cols</span>
              <input
                type="number"
                min={5}
                max={10}
                value={activeLevel.board.cols}
                onChange={(event) => updateBoard({ cols: Number(event.target.value) })}
              />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 12 }}>
            <label className="grid" style={{ gap: 6 }}>
              <span>Moves Limit</span>
              <input
                type="number"
                min={5}
                value={activeLevel.movesLimit}
                onChange={(event) => updateActive({ movesLimit: Number(event.target.value) })}
              />
            </label>
            <label className="grid" style={{ gap: 6 }}>
              <span>Par Moves</span>
              <input
                type="number"
                min={5}
                value={activeLevel.parMoves}
                onChange={(event) => updateActive({ parMoves: Number(event.target.value) })}
              />
            </label>
          </div>
          <div style={{ marginTop: 12 }}>
            <span>타일 타입</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {(['R', 'G', 'B', 'Y', 'P'] as const).map((color) => (
                <label key={color} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={activeLevel.board.tileTypes.includes(color)}
                    onChange={() => {
                      const exists = activeLevel.board.tileTypes.includes(color);
                      const tileTypes = exists
                        ? activeLevel.board.tileTypes.filter((item) => item !== color)
                        : [...activeLevel.board.tileTypes, color];
                      updateBoard({ tileTypes });
                    }}
                  />
                  {color}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>목표</h2>
          {activeLevel.objectives.map((objective, index) => (
            <div key={`${objective.type}-${index}`} className="panel" style={{ marginTop: 12 }}>
              <select
                value={objective.type}
                onChange={(event) =>
                  updateObjective(index, { type: event.target.value as Objective['type'], target: { score: 800 } })
                }
              >
                <option value="score">Score</option>
                <option value="collect">Collect</option>
                <option value="clear">Clear Layer</option>
              </select>
              {objective.type === 'score' && (
                <label className="grid" style={{ gap: 6, marginTop: 8 }}>
                  <span>목표 점수</span>
                  <input
                    type="number"
                    value={objective.target.score as number}
                    onChange={(event) =>
                      updateObjective(index, { ...objective, target: { score: Number(event.target.value) } })
                    }
                  />
                </label>
              )}
              {objective.type === 'collect' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <label className="grid" style={{ gap: 6 }}>
                    <span>색상</span>
                    <select
                      value={objective.target.color as string}
                      onChange={(event) =>
                        updateObjective(index, { ...objective, target: { ...objective.target, color: event.target.value } })
                      }
                    >
                      {(['R', 'G', 'B', 'Y', 'P'] as const).map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid" style={{ gap: 6 }}>
                    <span>개수</span>
                    <input
                      type="number"
                      value={objective.target.count as number}
                      onChange={(event) =>
                        updateObjective(index, { ...objective, target: { ...objective.target, count: Number(event.target.value) } })
                      }
                    />
                  </label>
                </div>
              )}
              {objective.type === 'clear' && (
                <label className="grid" style={{ gap: 6, marginTop: 8 }}>
                  <span>레이어 개수</span>
                  <input
                    type="number"
                    value={objective.target.count as number}
                    onChange={(event) =>
                      updateObjective(index, { ...objective, target: { ...objective.target, count: Number(event.target.value) } })
                    }
                  />
                </label>
              )}
              <button className="button-secondary" style={{ marginTop: 8 }} onClick={() => removeObjective(index)}>
                목표 삭제
              </button>
            </div>
          ))}
          <button className="button-primary" style={{ marginTop: 12 }} onClick={addObjective}>
            목표 추가
          </button>
        </section>

        <section className="panel">
          <h2>보드 배치</h2>
          <p style={{ color: 'var(--muted)' }}>툴을 선택한 뒤 셀을 클릭하세요.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {(['ice', 'jelly', 'blocked', 'clear'] as const).map((item) => (
              <button
                key={item}
                className={clsx('button-secondary', tool === item && 'tutorial-highlight')}
                onClick={() => setTool(item)}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, marginTop: 12, gap: 6 }}
          >
            {cells.map((cell) => {
              const isIce = iceCells.includes(cell);
              const isJelly = jellyCells.includes(cell);
              const isBlocked = blockedCells.includes(cell);
              return (
                <button
                  key={cell}
                  className={clsx('tile', isIce && 'ice', isJelly && 'jelly')}
                  style={{
                    background: isBlocked ? '#334155' : '#111827',
                    color: isBlocked ? '#f87171' : '#e2e8f0'
                  }}
                  onClick={() => handleToolClick(cell)}
                >
                  {cell}
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <h2>튜토리얼</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={activeLevel.tutorial?.enabled ?? false}
              onChange={(event) => {
                updateActive({ tutorial: { enabled: event.target.checked, steps: activeLevel.tutorial?.steps ?? [] } });
              }}
            />
            튜토리얼 활성화
          </label>
          {activeLevel.tutorial?.enabled &&
            (activeLevel.tutorial?.steps ?? []).map((step, index) => (
              <div key={`${step.type}-${index}`} className="panel" style={{ marginTop: 12 }}>
                <select
                  value={step.type}
                  onChange={(event) => {
                    updateTutorial(updateTutorialStep(activeLevel.tutorial?.steps ?? [], index, { ...step, type: event.target.value as TutorialStep['type'] }));
                  }}
                >
                  <option value="text">Text</option>
                  <option value="swapHint">Swap Hint</option>
                  <option value="highlightObjective">Highlight Objective</option>
                </select>
                <label className="grid" style={{ gap: 6, marginTop: 8 }}>
                  <span>Message</span>
                  <input
                    value={step.message ?? ''}
                    onChange={(event) =>
                      updateTutorial(updateTutorialStep(activeLevel.tutorial?.steps ?? [], index, { ...step, message: event.target.value }))
                    }
                  />
                </label>
                {step.type === 'swapHint' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <label className="grid" style={{ gap: 6 }}>
                      <span>Cell (row,col)</span>
                      <input
                        value={step.cell ?? ''}
                        onChange={(event) =>
                          updateTutorial(updateTutorialStep(activeLevel.tutorial?.steps ?? [], index, { ...step, cell: event.target.value }))
                        }
                      />
                    </label>
                    <label className="grid" style={{ gap: 6 }}>
                      <span>Direction</span>
                      <select
                        value={step.direction ?? 'right'}
                        onChange={(event) =>
                          updateTutorial(updateTutorialStep(activeLevel.tutorial?.steps ?? [], index, { ...step, direction: event.target.value as TutorialStep['direction'] }))
                        }
                      >
                        <option value="up">Up</option>
                        <option value="down">Down</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                  </div>
                )}
                <button className="button-secondary" style={{ marginTop: 8 }} onClick={() => removeTutorialStep(index)}>
                  삭제
                </button>
              </div>
            ))}
          {activeLevel.tutorial?.enabled && (
            <button className="button-primary" style={{ marginTop: 12 }} onClick={addTutorialStep}>
              튜토리얼 단계 추가
            </button>
          )}
        </section>

        <section className="panel">
          <h2>JSON Import / Export</h2>
          <textarea
            rows={10}
            value={jsonBuffer}
            onChange={(event) => setJsonBuffer(event.target.value)}
            placeholder="레벨 JSON을 붙여넣기 하세요."
            style={{ width: '100%', marginTop: 12, background: '#0b1220', color: 'var(--text)' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="button-secondary" onClick={exportJson}>
              Export
            </button>
            <button className="button-primary" onClick={handleImport}>
              Import
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
