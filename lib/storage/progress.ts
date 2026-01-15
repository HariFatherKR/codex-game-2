import type { Level } from "@/data/levels";

export type Progress = {
  unlockedLevelIds: string[];
  bestScores: Record<string, number>;
};

const storageKey = "codex-game-progress";

export function getDefaultProgress(levels: Level[]): Progress {
  const firstLevel = levels[0]?.id ?? "";
  return {
    unlockedLevelIds: firstLevel ? [firstLevel] : [],
    bestScores: {},
  };
}

export function loadProgress(levels: Level[]): Progress {
  if (typeof window === "undefined") {
    return getDefaultProgress(levels);
  }

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    return getDefaultProgress(levels);
  }

  try {
    const parsed = JSON.parse(stored) as Progress;
    if (!Array.isArray(parsed.unlockedLevelIds) || typeof parsed.bestScores !== "object") {
      return getDefaultProgress(levels);
    }
    return {
      unlockedLevelIds: parsed.unlockedLevelIds,
      bestScores: parsed.bestScores ?? {},
    };
  } catch {
    return getDefaultProgress(levels);
  }
}

export function saveProgress(progress: Progress): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(progress));
}

export function unlockNextLevel(levels: Level[], currentLevelId: string, progress: Progress): Progress {
  const currentIndex = levels.findIndex((level) => level.id === currentLevelId);
  const nextLevel = levels[currentIndex + 1];
  if (!nextLevel) {
    return progress;
  }
  if (progress.unlockedLevelIds.includes(nextLevel.id)) {
    return progress;
  }
  return {
    unlockedLevelIds: [...progress.unlockedLevelIds, nextLevel.id],
    bestScores: progress.bestScores,
  };
}

export function updateBestScore(
  progress: Progress,
  levelId: string,
  score: number
): Progress {
  const currentBest = progress.bestScores[levelId] ?? 0;
  if (score <= currentBest) {
    return progress;
  }
  return {
    unlockedLevelIds: progress.unlockedLevelIds,
    bestScores: {
      ...progress.bestScores,
      [levelId]: score,
    },
  };
}
