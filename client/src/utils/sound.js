// Efeitos sonoros sintetizados com Web Audio (sem arquivos de áudio). O jogador pode
// silenciar; a preferência fica em localStorage.
const STORAGE_KEY = 'truco.sound';

let context = null;

const readPreference = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
};

let enabled = typeof window === 'undefined' ? false : readPreference();

export const isSoundEnabled = () => enabled;

export const setSoundEnabled = (value) => {
  enabled = Boolean(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // sem localStorage: a preferência vale só nesta sessão
  }
};

const getContext = () => {
  if (context) return context;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  context = new AudioContextClass();
  return context;
};

const tone = (audio, { frequency, start = 0, duration = 0.12, type = 'sine', volume = 0.07 }) => {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const begin = audio.currentTime + start;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, begin);
  gain.gain.setValueAtTime(0.0001, begin);
  gain.gain.exponentialRampToValueAtTime(volume, begin + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, begin + duration);

  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(begin);
  oscillator.stop(begin + duration + 0.02);
};

const SOUNDS = {
  card: [{ frequency: 300, duration: 0.07, type: 'triangle', volume: 0.09 }],
  turn: [{ frequency: 660, duration: 0.1 }, { frequency: 880, start: 0.11, duration: 0.14 }],
  bet: [
    { frequency: 220, duration: 0.14, type: 'sawtooth', volume: 0.05 },
    { frequency: 330, start: 0.13, duration: 0.18, type: 'sawtooth', volume: 0.05 }
  ],
  win: [
    { frequency: 523, duration: 0.14 },
    { frequency: 659, start: 0.14, duration: 0.14 },
    { frequency: 784, start: 0.28, duration: 0.14 },
    { frequency: 1046, start: 0.42, duration: 0.3 }
  ],
  lose: [
    { frequency: 392, duration: 0.18, type: 'triangle' },
    { frequency: 330, start: 0.18, duration: 0.18, type: 'triangle' },
    { frequency: 262, start: 0.36, duration: 0.3, type: 'triangle' }
  ],
  chat: [{ frequency: 740, duration: 0.06, volume: 0.04 }]
};

export const playSound = (name) => {
  if (!enabled || !SOUNDS[name]) return;
  try {
    const audio = getContext();
    if (!audio) return;
    if (audio.state === 'suspended') audio.resume();
    SOUNDS[name].forEach(note => tone(audio, note));
  } catch {
    // áudio indisponível: o jogo segue sem som
  }
};
