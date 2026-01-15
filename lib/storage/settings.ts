import { loadFromStorage, saveToStorage } from "./localStorage";

export interface SettingsState {
  soundOn: boolean;
  hapticOn: boolean;
}

const SETTINGS_KEY = "codex-settings";

export const loadSettings = (): SettingsState =>
  loadFromStorage<SettingsState>(SETTINGS_KEY, { soundOn: true, hapticOn: true });

export const saveSettings = (settings: SettingsState) => {
  saveToStorage(SETTINGS_KEY, settings);
};
