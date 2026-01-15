import { SettingsState } from "../lib/storage/settings";

interface SettingsModalProps {
  open: boolean;
  settings: SettingsState;
  onClose: () => void;
  onChange: (settings: SettingsState) => void;
}

export default function SettingsModal({ open, settings, onClose, onChange }: SettingsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="overlay">
      <div className="modal">
        <h2>Settings</h2>
        <div className="grid" style={{ marginTop: 16 }}>
          <label className="card" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Sound</span>
            <input
              type="checkbox"
              checked={settings.soundOn}
              onChange={(event) => onChange({ ...settings, soundOn: event.target.checked })}
            />
          </label>
          <label className="card" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Haptic</span>
            <input
              type="checkbox"
              checked={settings.hapticOn}
              onChange={(event) => onChange({ ...settings, hapticOn: event.target.checked })}
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "flex-end" }}>
          <button className="button secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
