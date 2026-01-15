"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Level } from "@/data/levels";
import { getDefaultProgress, loadProgress } from "@/lib/storage/progress";

const formatScore = (score: number) => score.toLocaleString();

export default function LevelSelectClient({ levels }: { levels: Level[] }) {
  const [progress, setProgress] = useState(() => getDefaultProgress(levels));

  useEffect(() => {
    setProgress(loadProgress(levels));
  }, [levels]);

  const unlockedIds = useMemo(() => new Set(progress.unlockedLevelIds), [progress.unlockedLevelIds]);

  return (
    <section className="card-grid">
      {levels.map((level) => {
        const isUnlocked = unlockedIds.has(level.id);
        const bestScore = progress.bestScores[level.id];
        return (
          <div key={level.id} className="card">
            <div>
              <h3>{level.name}</h3>
              <p>Target Score: {formatScore(level.targetScore)}</p>
              <p>Moves Limit: {level.movesLimit}</p>
            </div>
            <div>
              <p>Best Score: {bestScore ? formatScore(bestScore) : "-"}</p>
            </div>
            <Link
              className={`button${isUnlocked ? "" : " secondary"}`}
              href={isUnlocked ? `/game/${level.id}` : "#"}
              aria-disabled={!isUnlocked}
            >
              {isUnlocked ? "Play" : "Locked"}
            </Link>
          </div>
        );
      })}
    </section>
  );
}
