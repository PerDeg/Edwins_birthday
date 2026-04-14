'use strict';

const Audio = (() => {
  let _ctx = null;
  let _musicTimeout = null;
  let _started = false;

  function ctx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    return _ctx;
  }

  function tone(freq, type, dur, vol, delay = 0, freqEnd = null) {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + delay + dur);
    gain.gain.setValueAtTime(Math.min(vol, 0.999), ac.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + dur + 0.01);
  }

  const MELODY = [261, 329, 392, 440, 523, 392, 329, 261, 196, 261];
  const BEAT = 0.42;

  function scheduleMelody() {
    if (!_started) return;
    MELODY.forEach((f, i) => tone(f, 'triangle', BEAT * 0.7, 0.10, i * BEAT));
    _musicTimeout = setTimeout(scheduleMelody, MELODY.length * BEAT * 1000);
  }

  return {
    start() {
      if (_started) return;
      _started = true;
      ctx(); // unlock AudioContext
      scheduleMelody();
    },
    stop() {
      _started = false;
      clearTimeout(_musicTimeout);
    },
    slash()   { tone(900, 'sawtooth', 0.07, 0.35); tone(450, 'square', 0.05, 0.18, 0.02); },
    jump()    { tone(220, 'sine', 0.18, 0.25, 0, 520); },
    djump()   { tone(330, 'sine', 0.14, 0.20, 0, 700); },
    hit()     { tone(140, 'sawtooth', 0.28, 0.55); },
    defeat()  { tone(130, 'square', 0.14, 0.45); tone(65, 'sine', 0.22, 0.35, 0.05); },
    levelUp() {
      [523,659,784,1047].forEach((f,i) => tone(f, 'triangle', 0.18, 0.30, i * 0.12));
    },
  };
})();
