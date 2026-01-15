'use client';

interface ResultModalProps {
  open: boolean;
  success: boolean;
  score: number;
  movesLeft: number;
  onRetry: () => void;
  onExit: () => void;
}

export default function ResultModal({ open, success, score, movesLeft, onRetry, onExit }: ResultModalProps) {
  if (!open) return null;
  return (
    <div className="overlay">
      <div className="modal">
        <h2>{success ? '레벨 클리어!' : '실패'}</h2>
        <p style={{ color: 'var(--muted)' }}>최종 점수: {score}</p>
        {success && <p style={{ color: 'var(--success)' }}>남은 Moves: {movesLeft}</p>}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="button-secondary" onClick={onExit}>
            나가기
          </button>
          <button className="button-primary" onClick={onRetry}>
            다시하기
          </button>
        </div>
      </div>
    </div>
  );
}
