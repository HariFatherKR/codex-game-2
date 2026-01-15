import { LevelDefinition } from './game/types';
import { defaultLevels } from './game/levels';

const LEVELS_KEY = 'codex-levels';
const SETTINGS_KEY = 'codex-settings';
const TUTORIAL_KEY = 'tutorialCompleted';

export interface SettingsState {
  soundOn: boolean;
  vibrationOn: boolean;
}

export const defaultSettings: SettingsState = {
  soundOn: true,
  vibrationOn: true
};

export const loadLevels = (): LevelDefinition[] => {
  if (typeof window === 'undefined') return defaultLevels;
  const stored = window.localStorage.getItem(LEVELS_KEY);
  if (!stored) {
    window.localStorage.setItem(LEVELS_KEY, JSON.stringify(defaultLevels));
    return defaultLevels;
  }
  try {
    return JSON.parse(stored) as LevelDefinition[];
  } catch {
    return defaultLevels;
  }
};

export const saveLevels = (levels: LevelDefinition[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LEVELS_KEY, JSON.stringify(levels));
};

export const loadSettings = (): SettingsState => {
  if (typeof window === 'undefined') return defaultSettings;
  const stored = window.localStorage.getItem(SETTINGS_KEY);
  if (!stored) return defaultSettings;
  try {
    return { ...defaultSettings, ...(JSON.parse(stored) as SettingsState) };
  } catch {
    return defaultSettings;
  }
};

export const saveSettings = (settings: SettingsState) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const isTutorialCompleted = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(TUTORIAL_KEY) === 'true';
};

export const setTutorialCompleted = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TUTORIAL_KEY, 'true');
};
