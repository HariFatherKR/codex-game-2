'use client';

interface ResultModalProps {
  open: boolean;
  success: boolean;
  score: number;
  bonus: number;
  onRestart: () => void;
  onExit: () => void;
}

export const ResultModal = ({ open, success, score, bonus, onRestart, onExit }: ResultModalProps) => {
  if (!open) return null;

  return (
    <div className="modal">
      <div className="modal-card">
        <h2>{success ? 'Level Clear!' : 'Try Again'}</h2>
        <p>Score: {score}</p>
        <p>Move Bonus: {bonus}</p>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="nav-button" onClick={onRestart}>
            Replay
          </button>
          <button className="nav-button" onClick={onExit}>
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};
