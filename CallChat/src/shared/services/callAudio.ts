let audioContext: AudioContext | null = null;
let timer: number | null = null;
let activeTone: "incoming" | "outgoing" | null = null;

function context() {
  audioContext ??= new AudioContext();
  return audioContext;
}

export function unlockCallAudio() {
  const current = context();
  if (current.state === "suspended") void current.resume();
}

function beep(frequency: number, duration: number) {
  const current = context();
  if (current.state === "suspended") void current.resume();
  const oscillator = current.createOscillator();
  const gain = current.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "sine";
  gain.gain.setValueAtTime(0.0001, current.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, current.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, current.currentTime + duration);
  oscillator.connect(gain).connect(current.destination);
  oscillator.start();
  oscillator.stop(current.currentTime + duration + 0.03);
}

export function startCallTone(kind: "incoming" | "outgoing") {
  if (activeTone === kind) return;
  stopCallTone();
  activeTone = kind;
  const play = () => {
    if (kind === "incoming") {
      beep(880, 0.18);
      window.setTimeout(() => beep(660, 0.22), 260);
    } else {
      beep(440, 0.65);
    }
  };
  play();
  timer = window.setInterval(play, kind === "incoming" ? 1800 : 2400);
}

export function stopCallTone() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  activeTone = null;
}
