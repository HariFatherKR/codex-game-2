'use client';

import type { Objective } from '../lib/game/types';

interface HudProps {
  movesLeft: number;
  score: number;
  objectives: Objective[];
  progress: Record<string, number>;
  highlightObjectives?: boolean;
}

const objectiveLabel = (objective: Objective) => {
  if (objective.type === 'score') return `Score ${objective.target.score}`;
  if (objective.type === 'collect') return `Collect ${objective.target.color}`;
  if (objective.type === 'clear') return `Clear ${objective.target.block}`;
  return 'Objective';
};

const objectiveKey = (objective: Objective, index: number) => `${objective.type}-${objective.target.color ?? ''}-${objective.target.block ?? ''}-${index}`;

export const Hud = ({ movesLeft, score, objectives, progress, highlightObjectives }: HudProps) => {
  return (
    <div className={`hud ${highlightObjectives ? 'highlight' : ''}`}>
      <div className="hud-item">
        <strong>Moves</strong>
        <div>{movesLeft}</div>
      </div>
      <div className="hud-item">
        <strong>Score</strong>
        <div>{score}</div>
      </div>
      {objectives.map((objective, index) => {
        const key = objectiveKey(objective, index);
        const targetCount = objective.target.score ?? objective.target.count ?? 0;
        const value = progress[key] ?? 0;
        return (
          <div className="hud-item" key={key}>
            <strong>{objectiveLabel(objective)}</strong>
            <div className="objective">
              <span>{value}</span>
              <span>/ {targetCount}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
