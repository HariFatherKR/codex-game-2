'use client';

import { SettingsState } from '../lib/storage';

interface SettingsModalProps {
  open: boolean;
  settings: SettingsState;
  onClose: () => void;
  onUpdate: (next: SettingsState) => void;
}

export default function SettingsModal({ open, settings, onClose, onUpdate }: SettingsModalProps) {
  if (!open) return null;
  return (
    <div className="overlay">
      <div className="modal">
        <h2>설정</h2>
        <p style={{ color: 'var(--muted)' }}>사운드와 진동 설정을 변경할 수 있습니다.</p>
        <div className="grid" style={{ gap: 12, marginTop: 16 }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>사운드</span>
            <input
              type="checkbox"
              checked={settings.soundOn}
              onChange={(event) => onUpdate({ ...settings, soundOn: event.target.checked })}
            />
          </label>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>진동 (모바일)</span>
            <input
              type="checkbox"
              checked={settings.vibrationOn}
              onChange={(event) => onUpdate({ ...settings, vibrationOn: event.target.checked })}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="button-secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
