import { defaultLevels } from "../game/levels";
import { LevelDefinition } from "../game/types";
import { loadFromStorage, saveToStorage } from "./localStorage";

const LEVELS_KEY = "codex-levels-v2";

export const loadLevels = (): LevelDefinition[] => {
  const stored = loadFromStorage<LevelDefinition[] | null>(LEVELS_KEY, null);
  if (stored && stored.length > 0) {
    return stored;
  }
  return defaultLevels;
};

export const saveLevels = (levels: LevelDefinition[]) => {
  saveToStorage(LEVELS_KEY, levels);
};
