export type SoundType = "match" | "special" | "explosion" | "clear" | "fail";

let audioContext: AudioContext | null = null;

const frequencies: Record<SoundType, number[]> = {
  match: [523, 659],
  special: [784, 988],
  explosion: [220, 110],
  clear: [659, 880, 1046],
  fail: [196, 130]
};

export const playSound = (type: SoundType, enabled: boolean) => {
  if (!enabled || typeof window === "undefined") {
    return;
  }
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  const ctx = audioContext;
  const now = ctx.currentTime;
  frequencies[type].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + index * 0.05);
    osc.stop(now + 0.25 + index * 0.05);
  });
};

export const triggerHaptic = (enabled: boolean, pattern: number[]) => {
  if (!enabled || typeof window === "undefined") {
    return;
  }
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};
