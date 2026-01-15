import { Level } from "@/data/levels";

export type Progress = {
  unlockedLevelIds: string[];
  bestScores: Record<string, number>;
};

const STORAGE_KEY = "codex-match-progress";

export const createDefaultProgress = (levels: Level[]): Progress => {
  const firstLevel = levels[0];
  if (!firstLevel) {
    return { unlockedLevelIds: [], bestScores: {} };
  }
  return { unlockedLevelIds: [firstLevel.id], bestScores: {} };
};

export const loadProgress = (levels: Level[]): Progress => {
  if (typeof window === "undefined") {
    return createDefaultProgress(levels);
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return createDefaultProgress(levels);
  }
  try {
    const parsed = JSON.parse(stored) as Progress;
    const unlockedLevelIds = Array.isArray(parsed.unlockedLevelIds)
      ? parsed.unlockedLevelIds
      : [];
    const bestScores = parsed.bestScores && typeof parsed.bestScores === "object"
      ? parsed.bestScores
      : {};
    return { unlockedLevelIds, bestScores };
  } catch {
    return createDefaultProgress(levels);
  }
};

export const saveProgress = (progress: Progress): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};
