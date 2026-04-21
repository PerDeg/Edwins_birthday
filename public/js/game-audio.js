'use strict';

const Audio = (() => {
  let _ctx        = null;
  let _musicGain  = null;   // dedicated GainNode for music — SFX bypass it
  let _musicTimeout = null;
  let _bossTimeout  = null;
  let _started    = false;

  function ctx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    return _ctx;
  }

  // Music-only output node — crossfades target this, SFX always go to destination
  function musicDest() {
    const ac = ctx();
    if (!_musicGain) {
      _musicGain = ac.createGain();
      _musicGain.gain.value = 1.0;
      _musicGain.connect(ac.destination);
    }
    return _musicGain;
  }

  // Fade current music out, then start new track and fade in
  function _crossfadeTo(startFn) {
    const ac = ctx();
    const mg = musicDest();
    mg.gain.cancelScheduledValues(ac.currentTime);
    mg.gain.setValueAtTime(mg.gain.value, ac.currentTime);
    mg.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 0.28);
    setTimeout(() => {
      mg.gain.setValueAtTime(0.0001, ac.currentTime);
      mg.gain.linearRampToValueAtTime(1.0, ac.currentTime + 0.38);
      startFn();
    }, 300);
  }

  // Generic oscillator tone — dest=null → SFX (straight to ac.destination)
  function tone(freq, type, dur, vol, delay = 0, freqEnd = null, dest = null) {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(dest || ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + delay + dur);
    gain.gain.setValueAtTime(Math.min(vol, 0.999), ac.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + dur + 0.01);
  }

  // Taiko drum: low sine sweep + sharp square transient
  function taiko(delay, vol = 0.55, dest = null) {
    const ac  = ctx();
    const out = dest || ac.destination;
    const o1 = ac.createOscillator(), g1 = ac.createGain();
    o1.connect(g1); g1.connect(out);
    o1.type = 'sine';
    o1.frequency.setValueAtTime(88, ac.currentTime + delay);
    o1.frequency.exponentialRampToValueAtTime(40, ac.currentTime + delay + 0.15);
    g1.gain.setValueAtTime(vol, ac.currentTime + delay);
    g1.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.30);
    o1.start(ac.currentTime + delay);
    o1.stop(ac.currentTime + delay + 0.31);

    const o2 = ac.createOscillator(), g2 = ac.createGain();
    o2.connect(g2); g2.connect(out);
    o2.type = 'square';
    o2.frequency.setValueAtTime(220, ac.currentTime + delay);
    g2.gain.setValueAtTime(vol * 0.25, ac.currentTime + delay);
    g2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.045);
    o2.start(ac.currentTime + delay);
    o2.stop(ac.currentTime + delay + 0.05);
  }

  // Shakuhachi-like flute note with vibrato
  function flute(freq, dur, vol, delay, dest = null) {
    const ac = ctx();
    const osc = ac.createOscillator(), gain = ac.createGain();
    osc.connect(gain); gain.connect(dest || ac.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);

    const lfo = ac.createOscillator(), lfog = ac.createGain();
    lfo.connect(lfog); lfog.connect(osc.frequency);
    lfo.type = 'sine'; lfo.frequency.value = 5.8;
    lfog.gain.value = 6;
    lfo.start(ac.currentTime + delay + 0.10);
    lfo.stop(ac.currentTime + delay + dur);

    gain.gain.setValueAtTime(0.001, ac.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ac.currentTime + delay + 0.04);
    gain.gain.setValueAtTime(vol, ac.currentTime + delay + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + dur + 0.01);
  }

  // ── Ninja theme: 128 BPM, E minor pentatonic ─────────────────────────────────
  const BPM = 128;
  const B   = 60 / BPM;
  const S   = B / 2;

  const N = {
    E2:82.4, A2:110, B2:123.5, D3:146.8,
    E3:164.8, G3:196, A3:220, B3:246.9, D4:293.7,
    E4:329.6, G4:392, A4:440, B4:493.9,
  };

  const PHRASE_A = [
    [N.E4,0,1.8],[N.G4,2,0.9],[N.A4,3,1.8],[N.G4,5,0.9],
    [N.E4,6,1.8],[N.D4,8,0.9],[N.B3,9,1.8],[N.D4,11,0.9],
    [N.E4,12,1.8],[N.G4,14,0.9],[N.A4,15,1.8],[N.G4,17,0.9],
    [N.E4,18,1.8],[N.B3,20,0.9],[N.A3,21,1.8],[N.G3,23,1.8],
    [N.A3,25,0.9],[N.B3,26,0.9],[N.D4,27,0.9],[N.E4,28,2.8],
  ];
  const PHRASE_B = [
    [N.A4,0,1.8],[N.G4,2,0.9],[N.E4,3,1.8],[N.D4,5,0.9],
    [N.E4,6,1.8],[N.G4,8,0.9],[N.A4,9,1.8],[N.G4,11,0.9],
    [N.B4,12,2.8],[N.A4,15,0.9],[N.G4,16,1.8],[N.E4,18,0.9],
    [N.D4,19,1.8],[N.E4,21,0.9],[N.G4,22,1.8],[N.E4,24,0.9],
    [N.D4,25,0.9],[N.B3,26,1.8],[N.A3,28,3.2],
  ];
  const BASS_A = [[N.E2,0,3.5],[N.E2,8,3.5],[N.D3,16,3.5],[N.B2,24,3.5]];
  const BASS_B = [[N.A2,0,3.5],[N.E2,8,3.5],[N.D3,16,3.5],[N.E2,24,3.5]];

  const DRUMS = [];
  for (let bar = 0; bar < 4; bar++) {
    const off = bar * 8;
    DRUMS.push([off+0, 0.65],[off+2, 0.40],[off+4, 0.65],[off+6, 0.40]);
  }

  let _phrase = 0;
  let _bossMode = false;

  // ── Boss theme: 148 BPM ───────────────────────────────────────────────────────
  const BBPM = 148;
  const BB   = 60 / BBPM;
  const BS   = BB / 2;
  const BOSS_MELODY = [
    [N.B4,0,1],[N.A4,2,0.8],[N.G4,3,1],[N.E4,5,0.8],
    [N.B4,6,0.8],[N.D4,7,0.5],[N.E4,8,1.5],[N.G4,11,0.5],
    [N.A4,12,1],[N.G4,14,0.8],[N.B4,15,1.5],[N.G4,18,0.5],
    [N.E4,19,1],[N.D4,21,0.8],[N.B3,22,2.5],
  ];
  const BOSS_BASS = [[N.E2,0,3.5],[N.B2,8,3.5],[N.A2,16,3.5],[N.E2,24,3.5]];
  const BOSS_DRUMS = [];
  for (let i = 0; i < 4; i++) {
    const o = i * 8;
    for (let k = 0; k < 8; k++)
      BOSS_DRUMS.push([o + k, k % 4 === 0 ? 0.85 : k % 2 === 0 ? 0.55 : 0.32]);
  }

  function scheduleBoss() {
    if (!_bossMode) return;
    const md = musicDest();
    const loopDur = 32 * BS;
    BOSS_MELODY.forEach(([hz, idx, dur]) => flute(hz, BS * dur * 0.8, 0.17, BS * idx, md));
    BOSS_BASS.forEach(([hz, idx, dur])   => tone(hz, 'sawtooth', BB * dur * 0.7, 0.24, BS * idx, null, md));
    BOSS_DRUMS.forEach(([idx, vol])       => taiko(BS * idx, vol, md));
    _bossTimeout = setTimeout(scheduleBoss, loopDur * 1000 - 20);
  }

  function scheduleMelody() {
    if (!_started) return;
    const phrase   = _phrase % 4 < 2 ? PHRASE_A : PHRASE_B;
    const bassLine = _phrase % 4 < 2 ? BASS_A   : BASS_B;
    const md = musicDest();
    const loopDur = 32 * S;

    phrase.forEach(([hz, idx, dur]) =>
      flute(hz, S * dur * 0.88, 0.13, S * idx, md)
    );
    DRUMS.forEach(([idx, vol]) => taiko(S * idx, vol, md));
    bassLine.forEach(([hz, idx, dur]) =>
      tone(hz, 'sine', B * dur * 0.85, 0.20, S * idx, null, md)
    );

    _phrase++;
    _musicTimeout = setTimeout(scheduleMelody, loopDur * 1000 - 20);
  }

  return {
    start() {
      if (_started) return;
      _started = true;
      const mg = musicDest();
      mg.gain.cancelScheduledValues(ctx().currentTime);
      mg.gain.setValueAtTime(1.0, ctx().currentTime);
      scheduleMelody();
    },
    stop() {
      _started = false;
      _bossMode = false;
      clearTimeout(_musicTimeout);
      clearTimeout(_bossTimeout);
      if (_musicGain && _ctx) {
        _musicGain.gain.cancelScheduledValues(_ctx.currentTime);
        _musicGain.gain.setValueAtTime(_musicGain.gain.value, _ctx.currentTime);
        _musicGain.gain.linearRampToValueAtTime(0.0001, _ctx.currentTime + 0.20);
      }
    },
    bossFight() {
      if (_bossMode) return;
      _bossMode = true;
      clearTimeout(_musicTimeout);
      _crossfadeTo(scheduleBoss);
    },
    stopBoss() {
      _bossMode = false;
      clearTimeout(_bossTimeout);
      if (_started) { _phrase = 0; _crossfadeTo(scheduleMelody); }
    },
    slash()  { tone(900, 'sawtooth', 0.06, 0.32); tone(450, 'square', 0.04, 0.16, 0.02); },
    jump()   { tone(220, 'sine', 0.16, 0.22, 0, 480); },
    djump()  { tone(330, 'sine', 0.13, 0.18, 0, 660); },
    hit()    { tone(120, 'sawtooth', 0.26, 0.50); tone(60, 'sine', 0.12, 0.25, 0.03); },
    defeat() { tone(130, 'square', 0.12, 0.42); tone(65, 'sine', 0.22, 0.32, 0.06); },
    shieldBlock() { tone(680, 'square', 0.06, 0.28); tone(340, 'sine', 0.08, 0.18, 0.03); },
    coin() {
      tone(1047, 'sine', 0.06, 0.22);
      tone(1319, 'sine', 0.06, 0.18, 0.055);
      tone(1568, 'sine', 0.08, 0.14, 0.105);
      tone(2093, 'sine', 0.05, 0.08, 0.155);
    },
    levelUp() {
      [329, 392, 494, 659].forEach((f, i) => tone(f, 'triangle', 0.20, 0.28, i * 0.12));
    },
  };
})();
