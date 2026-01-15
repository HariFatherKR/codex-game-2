import { useCallback } from 'react';

type SoundType = 'match' | 'special' | 'explosion' | 'clear' | 'fail';

const frequencies: Record<SoundType, number> = {
  match: 440,
  special: 660,
  explosion: 220,
  clear: 520,
  fail: 180,
};

export const useSound = (enabled: boolean) => {
  const playSound = useCallback(
    (type: SoundType) => {
      if (!enabled) return;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequencies[type];
      oscillator.type = 'triangle';
      gain.gain.value = 0.1;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
      oscillator.onended = () => context.close();
    },
    [enabled]
  );

  return { playSound };
};
