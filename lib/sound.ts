export type SoundType = 'match' | 'special' | 'explosion' | 'clear' | 'fail';

const frequencies: Record<SoundType, number> = {
  match: 440,
  special: 660,
  explosion: 220,
  clear: 880,
  fail: 180
};

export const playSound = (type: SoundType, enabled: boolean) => {
  if (!enabled || typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequencies[type];
  gain.gain.value = 0.12;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.18);
  oscillator.onended = () => {
    context.close();
  };
};

export const triggerHaptic = (pattern: number | number[], enabled: boolean) => {
  if (!enabled || typeof navigator === 'undefined') return;
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};
