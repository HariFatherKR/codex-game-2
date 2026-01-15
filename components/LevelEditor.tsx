'use client';

import { useMemo, useState } from 'react';
import type { LevelData, Objective, TileColor } from '../lib/game/types';

const blankObjective = (): Objective => ({ type: 'score', target: { score: 1000 } });

interface LevelEditorProps {
  levels: LevelData[];
  onSave: (levels: LevelData[]) => void;
  onTestPlay: (levelId: string) => void;
}

const createEmptyLevel = (): LevelData => ({
  id: `level-${Date.now()}`,
  name: 'New Level',
  board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
  movesLimit: 18,
  parMoves: 14,
  objectives: [blankObjective()],
  tutorial: { enabled: false, steps: [] },
});

export const LevelEditor = ({ levels, onSave, onTestPlay }: LevelEditorProps) => {
  const [activeId, setActiveId] = useState(levels[0]?.id ?? '');
  const [blockMode, setBlockMode] = useState<'ice' | 'jelly'>('ice');
  const level = useMemo(() => levels.find((item) => item.id === activeId) ?? levels[0], [levels, activeId]);

  if (!level) return <p>No level data.</p>;

  const updateLevel = (next: LevelData) => {
    onSave(levels.map((item) => (item.id === next.id ? next : item)));
  };

  const createLevel = () => {
    const next = createEmptyLevel();
    onSave([...levels, next]);
    setActiveId(next.id);
  };

  const duplicateLevel = () => {
    const duplicate: LevelData = { ...level, id: `level-${Date.now()}`, name: `${level.name} Copy` };
    onSave([...levels, duplicate]);
    setActiveId(duplicate.id);
  };

  const deleteLevel = () => {
    const filtered = levels.filter((item) => item.id !== level.id);
    if (filtered.length === 0) return;
    onSave(filtered);
    setActiveId(filtered[0].id);
  };

  const toggleBlock = (type: 'ice' | 'jelly', key: string) => {
    const specialBlocks = level.specialBlocks ? [...level.specialBlocks] : [];
    const target = specialBlocks.find((block) => block.type === type);
    if (target) {
      const index = target.cells.indexOf(key);
      if (index >= 0) target.cells.splice(index, 1);
      else target.cells.push(key);
    } else {
      specialBlocks.push({ type, cells: [key] });
    }
    updateLevel({ ...level, specialBlocks });
  };

  const cellHasBlock = (type: 'ice' | 'jelly', key: string) => {
    return level.specialBlocks?.find((block) => block.type === type)?.cells.includes(key) ?? false;
  };

  const updateObjective = (index: number, next: Objective) => {
    const objectives = [...level.objectives];
    objectives[index] = next;
    updateLevel({ ...level, objectives });
  };

  const addObjective = () => updateLevel({ ...level, objectives: [...level.objectives, blankObjective()] });

  const removeObjective = (index: number) => {
    const objectives = level.objectives.filter((_, idx) => idx !== index);
    updateLevel({ ...level, objectives });
  };

  const colorOptions: TileColor[] = ['R', 'G', 'B', 'Y', 'P'];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>Level Editor</h2>
      <div className="row">
        <select value={activeId} onChange={(event) => setActiveId(event.target.value)}>
          {levels.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button className="nav-button" onClick={() => onTestPlay(level.id)}>
          Test Play
        </button>
        <button className="nav-button" onClick={createLevel}>
          New
        </button>
        <button className="nav-button" onClick={duplicateLevel}>
          Duplicate
        </button>
        <button className="nav-button" onClick={deleteLevel}>
          Delete
        </button>
      </div>
      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Name</label>
          <input className="input" value={level.name} onChange={(e) => updateLevel({ ...level, name: e.target.value })} />
        </div>
        <div>
          <label>Moves</label>
          <input
            className="input"
            type="number"
            value={level.movesLimit}
            onChange={(e) => updateLevel({ ...level, movesLimit: Number(e.target.value) })}
          />
        </div>
        <div>
          <label>Par</label>
          <input
            className="input"
            type="number"
            value={level.parMoves}
            onChange={(e) => updateLevel({ ...level, parMoves: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <h3>Objectives</h3>
        {level.objectives.map((objective, index) => (
          <div className="row" key={`obj-${index}`} style={{ marginBottom: 8 }}>
            <select
              value={objective.type}
              onChange={(event) =>
                updateObjective(index, { type: event.target.value as Objective['type'], target: {} })
              }
            >
              <option value="score">Score</option>
              <option value="collect">Collect</option>
              <option value="clear">Clear</option>
            </select>
            {objective.type === 'score' && (
              <input
                className="input"
                type="number"
                value={objective.target.score ?? 0}
                onChange={(e) => updateObjective(index, { ...objective, target: { score: Number(e.target.value) } })}
              />
            )}
            {objective.type === 'collect' && (
              <>
                <select
                  value={objective.target.color ?? 'R'}
                  onChange={(e) =>
                    updateObjective(index, { ...objective, target: { ...objective.target, color: e.target.value as TileColor } })
                  }
                >
                  {colorOptions.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  value={objective.target.count ?? 0}
                  onChange={(e) =>
                    updateObjective(index, { ...objective, target: { ...objective.target, count: Number(e.target.value) } })
                  }
                />
              </>
            )}
            {objective.type === 'clear' && (
              <>
                <select
                  value={objective.target.block ?? 'ice'}
                  onChange={(e) =>
                    updateObjective(index, { ...objective, target: { ...objective.target, block: e.target.value as 'ice' | 'jelly' } })
                  }
                >
                  <option value="ice">Ice</option>
                  <option value="jelly">Jelly</option>
                </select>
                <input
                  className="input"
                  type="number"
                  value={objective.target.count ?? 0}
                  onChange={(e) =>
                    updateObjective(index, { ...objective, target: { ...objective.target, count: Number(e.target.value) } })
                  }
                />
              </>
            )}
            <button className="nav-button" onClick={() => removeObjective(index)}>
              Remove
            </button>
          </div>
        ))}
        <button className="nav-button" onClick={addObjective}>
          Add Objective
        </button>
      </div>
      <div>
        <h3>Blocks</h3>
        <p>Click cells to toggle Ice/Jelly.</p>
        <div className="row" style={{ gap: 16 }}>
          <button className={`nav-button ${blockMode === 'ice' ? 'active' : ''}`} onClick={() => setBlockMode('ice')}>
            Ice ❄
          </button>
          <button className={`nav-button ${blockMode === 'jelly' ? 'active' : ''}`} onClick={() => setBlockMode('jelly')}>
            Jelly ✧
          </button>
        </div>
        <div
          className="grid editor-grid"
          style={{
            gridTemplateColumns: `repeat(${level.board.cols}, var(--tile-size))`,
            marginTop: 12,
          }}
        >
          {Array.from({ length: level.board.rows }).map((_, r) =>
            Array.from({ length: level.board.cols }).map((__, c) => {
              const key = `${r},${c}`;
              const hasIce = cellHasBlock('ice', key);
              const hasJelly = cellHasBlock('jelly', key);
              return (
                <button
                  key={key}
                  className="tile"
                  onClick={() => toggleBlock(blockMode, key)}
                >
                  <span style={{ fontSize: 12 }}>{hasIce ? '❄' : ''}</span>
                  <span style={{ fontSize: 12 }}>{hasJelly ? '✧' : ''}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
      <div>
        <h3>JSON Export</h3>
        <textarea
          className="input"
          rows={6}
          value={JSON.stringify(level, null, 2)}
          onChange={(event) => {
            try {
              const parsed = JSON.parse(event.target.value) as LevelData;
              updateLevel(parsed);
            } catch {
              // ignore invalid
            }
          }}
        />
      </div>
    </div>
  );
};
