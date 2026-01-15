'use client';

interface SettingsModalProps {
  open: boolean;
  soundOn: boolean;
  vibrationOn: boolean;
  onClose: () => void;
  onToggleSound: (value: boolean) => void;
  onToggleVibration: (value: boolean) => void;
}

export const SettingsModal = ({
  open,
  soundOn,
  vibrationOn,
  onClose,
  onToggleSound,
  onToggleVibration,
}: SettingsModalProps) => {
  if (!open) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h2>Settings</h2>
        <div className="row" style={{ alignItems: 'center' }}>
          <label style={{ flex: 1 }}>Sound</label>
          <input type="checkbox" checked={soundOn} onChange={(e) => onToggleSound(e.target.checked)} />
        </div>
        <div className="row" style={{ alignItems: 'center', marginTop: 12 }}>
          <label style={{ flex: 1 }}>Vibration</label>
          <input type="checkbox" checked={vibrationOn} onChange={(e) => onToggleVibration(e.target.checked)} />
        </div>
        <button className="nav-button" style={{ marginTop: 16 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};
