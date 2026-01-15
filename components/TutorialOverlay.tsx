'use client';

import type { TutorialStep } from '../lib/game/types';

interface TutorialOverlayProps {
  step: TutorialStep | null;
  onNext: () => void;
}

export const TutorialOverlay = ({ step, onNext }: TutorialOverlayProps) => {
  if (!step) return null;

  return (
    <div className="tutorial-overlay" onClick={onNext}>
      <div className="tutorial-card">
        <p>{step.message ?? '튜토리얼 진행 중입니다.'}</p>
        {step.type === 'swapHint' && step.direction && <p>👉 {step.direction.toUpperCase()} 방향으로 스왑</p>}
        <button className="nav-button" style={{ marginTop: 8 }}>
          다음
        </button>
      </div>
    </div>
  );
};
