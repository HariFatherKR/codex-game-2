import { LevelDefinition } from "./types";

const LEVELS_KEY = "codex-levels-v2";
const SETTINGS_KEY = "codex-settings-v2";
const TUTORIAL_KEY = "codex-tutorial-complete";

export interface SettingsState {
  soundOn: boolean;
  vibrationOn: boolean;
}

export const loadLevels = (fallback: LevelDefinition[]) => {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(LEVELS_KEY);
  if (!stored) return fallback;
  try {
    return JSON.parse(stored) as LevelDefinition[];
  } catch (error) {
    console.error("Failed to parse levels", error);
    return fallback;
  }
};

export const saveLevels = (levels: LevelDefinition[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEVELS_KEY, JSON.stringify(levels));
};

export const loadSettings = (): SettingsState => {
  if (typeof window === "undefined") return { soundOn: true, vibrationOn: true };
  const stored = window.localStorage.getItem(SETTINGS_KEY);
  if (!stored) return { soundOn: true, vibrationOn: true };
  try {
    return JSON.parse(stored) as SettingsState;
  } catch (error) {
    console.error("Failed to parse settings", error);
    return { soundOn: true, vibrationOn: true };
  }
};

export const saveSettings = (settings: SettingsState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const loadTutorialComplete = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(TUTORIAL_KEY) === "true";
};

export const saveTutorialComplete = () => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TUTORIAL_KEY, "true");
};
