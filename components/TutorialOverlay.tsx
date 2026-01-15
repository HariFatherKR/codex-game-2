import { TutorialStep } from "../lib/game/types";

interface TutorialOverlayProps {
  steps: TutorialStep[];
  stepIndex: number;
  onNext: () => void;
}

export default function TutorialOverlay({ steps, stepIndex, onNext }: TutorialOverlayProps) {
  const step = steps[stepIndex];
  if (!step) {
    return null;
  }

  return (
    <div className="overlay" onClick={onNext}>
      <div className="tutorial-bubble">
        <p style={{ margin: 0, fontWeight: 600 }}>Tutorial</p>
        <p style={{ margin: "8px 0 0" }}>{step.message ?? "다음 단계를 확인하세요"}</p>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "#94a3b8" }}>Tap to continue</p>
      </div>
    </div>
  );
}
