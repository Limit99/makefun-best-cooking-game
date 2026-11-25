// All sound is synthesised with WebAudio — no audio files, no network.
// A short blip for a grab, a filtered noise burst for the grill's sizzle,
// a two-note ding for a served order and a low buzz for a wrong move.
export function createAudio() {
  let context = null;

  function ensure() {
    if (!context) {
      try {
        const AudioContext = window.AudioContext ?? window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context && context.state === 'suspended') context.resume();
    return context;
  }

  function tone(frequency, duration, type, gainValue, when = 0) {
    const audio = ensure();
    if (!audio) return;
    try {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audio.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(gainValue, audio.currentTime + when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + when + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(audio.currentTime + when);
    oscillator.stop(audio.currentTime + when + duration + 0.05);
    } catch {
      // A browser that refuses a sound must never break a click.
    }
  }

  function noise(duration, gainValue) {
    const audio = ensure();
    if (!audio) return;
    try {
    const length = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    const gain = audio.createGain();
    gain.gain.value = gainValue;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start();
    } catch {
      // A browser that refuses a sound must never break a click.
    }
  }

  return {
    unlock() {
      ensure();
    },
    grab() {
      tone(520, 0.07, 'triangle', 0.12);
    },
    place() {
      tone(340, 0.08, 'triangle', 0.12);
      noise(0.12, 0.05);
    },
    chop() {
      noise(0.08, 0.16);
      tone(180, 0.06, 'square', 0.06);
    },
    sizzle() {
      noise(0.35, 0.07);
    },
    ready() {
      tone(660, 0.1, 'sine', 0.1);
      tone(880, 0.14, 'sine', 0.1, 0.09);
    },
    serve() {
      tone(784, 0.12, 'sine', 0.14);
      tone(1047, 0.2, 'sine', 0.14, 0.1);
    },
    wrong() {
      tone(140, 0.22, 'sawtooth', 0.08);
    },
    expire() {
      tone(220, 0.3, 'sawtooth', 0.07);
      tone(165, 0.35, 'sawtooth', 0.07, 0.12);
    },
  };
}
