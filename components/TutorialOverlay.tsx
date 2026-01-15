'use client';

import { TutorialStep } from '../lib/game/types';

interface TutorialOverlayProps {
  open: boolean;
  steps: TutorialStep[];
  current: number;
  onNext: () => void;
}

const directionArrow = (direction?: string) => {
  switch (direction) {
    case 'up':
      return '⬆️';
    case 'down':
      return '⬇️';
    case 'left':
      return '⬅️';
    case 'right':
      return '➡️';
    default:
      return '';
  }
};

export default function TutorialOverlay({ open, steps, current, onNext }: TutorialOverlayProps) {
  if (!open || steps.length === 0) return null;
  const step = steps[current];
  return (
    <div className="overlay">
      <div className="modal">
        <h3>튜토리얼</h3>
        <div style={{ marginTop: 12 }}>
          {step.type === 'swapHint' && (
            <p>
              손가락으로 {directionArrow(step.direction)} 방향으로 스왑해보세요.
            </p>
          )}
          {step.type === 'highlightObjective' && <p>{step.message ?? '목표를 확인해보세요.'}</p>}
          {step.type === 'text' && <p>{step.message}</p>}
        </div>
        <button className="button-primary" style={{ marginTop: 16 }} onClick={onNext}>
          다음
        </button>
      </div>
    </div>
  );
}
