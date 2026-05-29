'use strict';

// ── Canvas & scaling ──────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d', { alpha: false });
let scale = 1;

function resize() {
  const vw  = window.visualViewport ? window.visualViewport.width  : window.innerWidth;
  const vh  = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const sx  = vw / C.W;
  const sy  = vh / C.H;
  scale = Math.min(sx, sy);
  const cw = C.W * scale, ch = C.H * scale;
  canvas.style.width   = cw + 'px';
  canvas.style.height  = ch + 'px';
  canvas.style.left    = (vw - cw) / 2 + 'px';
  canvas.style.top     = (vh - ch) / 2 + 'px';
  // Cap DPR at 1.5 — crisp on Retina without the 4× pixel cost of full DPR
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width  = Math.round(C.W * dpr);
  canvas.height = Math.round(C.H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();

// ── Input ──────────────────────────────────────────────────────────────────────
const keys = {}, prevKeys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.code] = false; });
function keyJustPressed(code) { return !!(keys[code] && !prevKeys[code]); }

['btn-left','btn-right','btn-down','btn-jump','btn-attack','btn-throw'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const map = {
    'btn-left':   'ArrowLeft',
    'btn-right':  'ArrowRight',
    'btn-down':   'ArrowDown',
    'btn-jump':   'Space',
    'btn-attack': 'KeyZ',
    'btn-throw':  'KeyX',
  };
  el.addEventListener('touchstart', e => { e.preventDefault(); keys[map[id]] = true;  }, { passive:false });
  el.addEventListener('touchend',   e => { e.preventDefault(); keys[map[id]] = false; }, { passive:false });
});

const _isTouchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
const mouse = { x: C.W / 2, y: C.H / 2 };

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) / scale;
  mouse.y = (e.clientY - r.top)  / scale;
});

// ── Virtual joystick state ─────────────────────────────────────────────────────
const _joy = { id: -1, baseX: 0, baseY: 0, dx: 0, dy: 0 };
const joyKeys = { ArrowLeft: false, ArrowRight: false, ArrowDown: false };
const JOY_DEAD = 22, JOY_MAX = 60;

canvas.addEventListener('touchstart', e => {
  const r = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) {
    const cx = (t.clientX - r.left) / scale;
    const cy = (t.clientY - r.top)  / scale;
    if (cx < C.W * 0.44 && _joy.id === -1 &&
        (gameState === STATE.PLAYING || gameState === STATE.SURVIVAL)) {
      _joy.id = t.identifier;
      _joy.baseX = cx; _joy.baseY = cy; _joy.dx = 0; _joy.dy = 0;
      e.preventDefault();
      return;
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  const r = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) {
    if (t.identifier === _joy.id) {
      _joy.dx = (t.clientX - r.left) / scale - _joy.baseX;
      _joy.dy = (t.clientY - r.top)  / scale - _joy.baseY;
      e.preventDefault();
    } else {
      mouse.x = (t.clientX - r.left) / scale;
      mouse.y = (t.clientY - r.top)  / scale;
    }
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  const r = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) {
    if (t.identifier === _joy.id) {
      _joy.id = -1; _joy.dx = 0; _joy.dy = 0;
      keys['ArrowLeft'] = keys['ArrowRight'] = keys['ArrowDown'] = false;
    } else {
      mouse.x = (t.clientX - r.left) / scale;
      mouse.y = (t.clientY - r.top)  / scale;
      handleClick();
    }
  }
});

// ── Game state ─────────────────────────────────────────────────────────────────
const STATE = {
  MENU:           'menu',
  PLAYING:        'playing',
  GAMEOVER:       'gameover',
  SUBMIT:         'submit',
  LEADERBOARD:    'leaderboard',
  LEVEL_COMPLETE: 'level_complete',
  VICTORY:        'victory',
  UPGRADE_PICK:   'upgrade_pick',
  SURVIVAL:       'survival',
  SURVIVAL_OVER:  'survival_over',
};
let gameState = STATE.MENU;

// ── Entity arrays ──────────────────────────────────────────────────────────────
let player        = null;
let platforms     = [], enemies = [], shurikens = [];
let particles     = [], floatingTexts = [], petals = [];
let coins         = [], pickups = [], playerShurikens = [], boss = null;
let hidingSpots   = [];
let ladders       = [], spikes = [];
let movingPlatforms = [];
let checkpoints   = [];
let smokeBombs    = [];

// ── Counters & flags ───────────────────────────────────────────────────────────
let score = 0, combo = 1, comboTimer = 0, lives = 0, level = 1, kills = 0;
let screenFlash      = 0;
let playerWeapon     = 'sword';   // 'sword'|'shuriken'|'triple'|'knife'|'banana'
let throwCooldown    = 0;
let throwAmmo        = 0;
let playerHp         = C.PLAYER_HP;
let ammoDisplayTimer = 0;
let gemPower         = false;
let gemGlowTimer     = 0;
let currentLevelIdx  = 0;
let bgTheme          = 0;
let levelWidth       = C.LEVEL_DATA[0].width;
let levelCompleteTimer = 0;

// ── Level stats (for rank) ─────────────────────────────────────────────────────
let levelTimer        = 0;   // seconds elapsed in current level
let levelKills        = 0;   // enemy kills in current level (excluding boss)
let levelTotalEnemies = 0;   // total enemies spawned this level
let lastLevelRank     = '';  // 'S'|'A'|'B'|'C'|'D'
let levelAlertCount   = 0;   // number of unique grunt alerts this level (stealth run tracking)

// ── Upgrade system ─────────────────────────────────────────────────────────────
let playerUpgrades  = {};   // { id: true } for each active upgrade
let playerMaxHp     = 100;  // adjustable via hp_max upgrade
let playerBonusAmmo = 0;    // extra ammo from ammo_plus upgrade
let upgradeChoices  = [];   // 3 current upgrade options (shown in UPGRADE_PICK state)
let _nextLevelIdx   = 0;    // level to load after upgrade pick

// ── Kill streak ────────────────────────────────────────────────────────────────
let streakKills = 0;

// ── Survival mode ─────────────────────────────────────────────────────────────
let survivalMode        = false;
let survivalWave        = 0;
let survivalScore       = 0;
let survivalKills       = 0;
let wavePhase           = 'between';   // 'between' | 'fighting'
let waveCountdown       = 3;
let survivalSpawnQueue  = [];          // pending enemy blueprints
let survivalSpawnTimer  = 0;           // seconds until next spawn from queue
let survivalLeaderboard = [];
let waveEvent           = '';          // '' | 'blackout' | 'kaos' | 'goldrain' | 'ghost'
let waveEventTimer      = 0;
// ── Co-op ─────────────────────────────────────────────────────────────────────
let coopMode    = false;
let player2     = null;
let p2Shurikens = [];
let p2Hp        = C.PLAYER_HP;
let p2Weapon    = 'sword';
let p2ThrowAmmo = 0;
let p2ThrowCooldown = 0;

// ── Ground pound wave ─────────────────────────────────────────────────────────
let groundPoundWave = null;

// ── Camera ─────────────────────────────────────────────────────────────────────
const cam = { x: 0, shake: 0, shakeDur: 0 };
function triggerShake(mag, dur) { cam.shake = mag; cam.shakeDur = dur; }

// ── Score submit ───────────────────────────────────────────────────────────────
let submitName = '', submitRank = null, leaderboard = [], submitDone = false;

const _nameInput      = document.getElementById('name-input');
const _submitOverlay  = document.getElementById('submit-overlay');
const _submitHeading  = document.getElementById('submit-heading');
const _submitScore    = document.getElementById('submit-score');
const _submitRankEl   = document.getElementById('submit-rank');
const _rankNum        = document.getElementById('rank-num');
const _menuOverlay    = document.getElementById('menu-overlay');

const _touchControls = document.getElementById('touch-controls');
function _setTouchControls(visible) {
  if (!_touchControls) return;
  _touchControls.classList.toggle('hidden', !visible);
}

function _showOverlay() {
  _setTouchControls(false);
  if (!_submitOverlay) return;
  const isVictory = (gameState === STATE.VICTORY);
  _submitHeading.textContent = isVictory ? 'GRATTIS! 🥷' : 'GAME OVER';
  _submitScore.textContent   =
    `Poäng: ${score.toLocaleString('sv')}  ·  Nivå ${level}  ·  ${kills} fiender`;
  if (_submitRankEl) _submitRankEl.style.display = 'none';
  const saveBtn = document.getElementById('btn-save-score');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Spara'; }
  if (_nameInput)  { _nameInput.value = ''; }
  _submitOverlay.style.display = 'flex';
  setTimeout(() => _nameInput && _nameInput.focus(), 80);
}

function _hideOverlay() {
  if (_submitOverlay) _submitOverlay.style.display = 'none';
}

function _showMenu() {
  gameState = STATE.MENU;
  _setTouchControls(false);
  if (_menuOverlay) _menuOverlay.style.display = 'flex';
  fetchLeaderboard();
}

function _hideMenu() {
  if (_menuOverlay) _menuOverlay.style.display = 'none';
}

// ── Loop timestamp ─────────────────────────────────────────────────────────────
let lastTime = 0;
let slowMoTimer = 0;
let gemWave = null;   // expanding ring visualisation for gem special

// ── Canvas UI click handler (in-game screens only) ────────────────────────────
function handleClick() {
  function hit(cx, cy, w, h) {
    return mouse.x >= cx-w/2 && mouse.x <= cx+w/2 && mouse.y >= cy-h/2 && mouse.y <= cy+h/2;
  }

  if (gameState === STATE.LEVEL_COMPLETE && hit(C.W*0.5, C.H*0.5+80, 240, 50)) {
    advanceNextLevel();
  }
  if (gameState === STATE.LEADERBOARD && hit(C.W*0.5, C.H*0.5+200, 180, 42)) {
    _resetSubmitFlags(); _showMenu();
  }
  if (gameState === STATE.UPGRADE_PICK) {
    const cardW = 200, cardH = 270, cy = C.H/2 + 30;
    const xs = [C.W/2 - 240, C.W/2, C.W/2 + 240];
    xs.forEach((cx, i) => {
      if (hit(cx, cy, cardW, cardH) && upgradeChoices[i]) selectUpgrade(upgradeChoices[i].id);
    });
  }
  if (gameState === STATE.SURVIVAL_OVER && hit(C.W/2, C.H/2 + 70, 230, 50)) {
    startSurvivalSubmit();
  }
  if (gameState === STATE.SURVIVAL_OVER && hit(C.W/2, C.H/2 + 134, 180, 42)) {
    _resetSubmitFlags(); survivalMode = false; _showMenu();
  }
}

// ── Score submit (called by HTML overlay buttons) ─────────────────────────────
function startSubmit() {
  gameState = STATE.SUBMIT;
  submitName = ''; submitRank = null; submitDone = false;
  _showOverlay();
}

function startSurvivalSubmit() {
  gameState = STATE.SUBMIT;
  submitName = ''; submitRank = null; submitDone = false;
  _submitHeading.textContent = 'SURVIVAL OVER!';
  _submitScore.textContent   = `Poäng: ${survivalScore.toLocaleString('sv')}  ·  Våning ${survivalWave}  ·  ${survivalKills} fiender`;
  const saveBtn = document.getElementById('btn-save-score');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Spara'; }
  if (_nameInput) _nameInput.value = '';
  if (_submitRankEl) _submitRankEl.style.display = 'none';
  if (_submitOverlay) _submitOverlay.style.display = 'flex';
  setTimeout(() => _nameInput && _nameInput.focus(), 80);
}

function finishSubmit(name) {
  const n = (name || '').trim();
  if (!n) return;
  submitName = n;
  const payload = survivalMode
    ? { name: n, score: survivalScore, level: survivalWave, kills: survivalKills, difficulty: 'survival' }
    : { name: n, score, level, kills };
  fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(r => r.json().then(d => { if (!r.ok) throw new Error(d.detail || d.error || 'HTTP ' + r.status); return d; }))
    .then(d => {
      submitRank = d.rank;
      submitDone = true;
      if (_submitRankEl && _rankNum) {
        _rankNum.textContent = d.rank;
        _submitRankEl.style.display = 'block';
        _submitRankEl.style.color = '';
      }
      fetchLeaderboard();
    })
    .catch(e => {
      console.error('Score submit error:', e);
      if (_submitRankEl) {
        _submitRankEl.textContent = 'Kunde inte spara — kontrollera anslutningen.';
        _submitRankEl.style.display = 'block';
        _submitRankEl.style.color = '#ff6060';
      }
      const saveBtn = document.getElementById('btn-save-score');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Försök igen'; }
    });
}

function fetchLeaderboard() {
  fetch('/api/scores')
    .then(r => r.json())
    .then(d => { leaderboard = Array.isArray(d) ? d : []; })
    .catch(e => console.error('Leaderboard fetch error:', e));
}

function fetchSurvivalLeaderboard() {
  fetch('/api/scores?difficulty=survival')
    .then(r => r.json())
    .then(d => { survivalLeaderboard = Array.isArray(d) ? d : []; })
    .catch(e => console.error('Survival leaderboard fetch error:', e));
}

function initSurvival() {
  _hideMenu();
  _resetSubmitFlags();
  _setTouchControls(true);
  Audio.stop();
  setTimeout(() => Audio.start(), 320);
  HUD.reset();

  player = new Player();
  player.x = 600; player.y = 300;
  particles = []; floatingTexts = []; petals = [];
  coins = []; pickups = []; playerShurikens = []; shurikens = [];
  hidingSpots = []; ladders = []; spikes = []; movingPlatforms = [];
  checkpoints = []; smokeBombs = [];

  platforms = SURVIVAL_ARENA.platforms.map(p => ({ ...p, h: 14 }));
  enemies   = [];
  boss      = null;

  score = 0; combo = 1; comboTimer = 0; kills = 0; screenFlash = 0;
  playerWeapon = 'sword'; throwAmmo = 0; gemPower = false;
  playerHp = C.PLAYER_HP; playerMaxHp = C.PLAYER_HP;
  playerUpgrades = {}; playerBonusAmmo = 0; streakKills = 0;
  levelAlertCount = 0; levelTimer = 0; levelKills = 0; groundPoundWave = null;

  survivalMode       = true;
  survivalWave       = 0;
  survivalScore      = 0;
  survivalKills      = 0;
  wavePhase          = 'between';
  waveCountdown      = 2;
  survivalSpawnQueue = [];
  survivalSpawnTimer = 0;
  waveEvent          = '';
  waveEventTimer     = 0;
  p2Shurikens        = [];
  p2Hp               = C.PLAYER_HP;
  p2Weapon           = 'sword';
  p2ThrowAmmo        = 0;
  p2ThrowCooldown    = 0;

  if (coopMode) {
    player2 = new Player();
    player2.x = 400; player2.y = 300;
    player2.headbandColor = '#4499ff';  // blue headband for P2
  } else {
    player2 = null;
  }
  level         = 0;
  levelWidth    = C.W;
  bgTheme       = 0;
  Background.setTheme(0);
  cam.x = 0; cam.shake = 0; cam.shakeDur = 0;

  fetchSurvivalLeaderboard();
  gameState = STATE.SURVIVAL;
}

function _resetSubmitFlags() {
  _gOverShown = false; _victoryShown = false;
}

// ── Main Game Loop ─────────────────────────────────────────────────────────────
let _gOverShown = false, _victoryShown = false;
function loop(now) {
  const rawDt = lastTime === 0 ? 0 : Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (slowMoTimer > 0) slowMoTimer = Math.max(0, slowMoTimer - rawDt);
  const dt = rawDt * (slowMoTimer > 0 ? C.SLOW_MO_FACTOR : 1);

  // Joystick → inject into keys[] so all existing keyJustPressed / held checks work
  if (_joy.id !== -1) {
    keys['ArrowLeft']  = _joy.dx < -JOY_DEAD;
    keys['ArrowRight'] = _joy.dx >  JOY_DEAD;
    keys['ArrowDown']  = _joy.dy >  JOY_DEAD;
  }

  const _t0 = performance.now();
  update(dt);
  const _t1 = performance.now();
  draw(dt);
  const _t2 = performance.now();
  // Smooth the readings with EMA so the display is readable
  _diagUpdateMs = _diagUpdateMs * 0.85 + (_t1 - _t0) * 0.15;
  _diagDrawMs   = _diagDrawMs   * 0.85 + (_t2 - _t1) * 0.15;

  if (gameState === STATE.LEVEL_COMPLETE && levelCompleteTimer <= 0) {
    advanceNextLevel();
  }
  if (gameState === STATE.GAMEOVER && !_gOverShown) {
    _gOverShown = true; startSubmit();
  }
  if (gameState === STATE.VICTORY && !_victoryShown) {
    _victoryShown = true; startSubmit();
  }

  _setTouchControls(gameState === STATE.PLAYING || gameState === STATE.SURVIVAL);

  Object.assign(prevKeys, keys);
  requestAnimationFrame(loop);
}

// ── Canvas click / touch — in-game screens ────────────────────────────────────
canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) / scale;
  mouse.y = (e.clientY - r.top)  / scale;
  handleClick();
});
// (canvas touchend now handled by the joystick listener above)

// ── HTML overlay buttons ──────────────────────────────────────────────────────
document.getElementById('btn-save-score')?.addEventListener('click', () => {
  const n = _nameInput ? _nameInput.value.trim() : '';
  if (!n) { if (_nameInput) _nameInput.focus(); return; }
  const saveBtn = document.getElementById('btn-save-score');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '✓'; }
  finishSubmit(n);
});

// Enter key in name field triggers save
_nameInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-save-score')?.click();
});

document.getElementById('btn-play-again')?.addEventListener('click', () => {
  _hideOverlay();
  _resetSubmitFlags();
  if (survivalMode) initSurvival();
  else initGame();
});

document.getElementById('btn-quit')?.addEventListener('click', () => {
  _hideOverlay();
  _resetSubmitFlags();
  _showMenu();
});

// ── Menu overlay start button ─────────────────────────────────────────────────
document.getElementById('btn-start-game')?.addEventListener('click', () => {
  _hideMenu(); _resetSubmitFlags(); initGame();
});
document.getElementById('btn-start-game')?.addEventListener('touchend', e => {
  e.preventDefault(); _hideMenu(); _resetSubmitFlags(); initGame();
}, { passive: false });

document.getElementById('btn-start-survival')?.addEventListener('click', () => {
  coopMode = false; initSurvival();
});
document.getElementById('btn-start-survival')?.addEventListener('touchend', e => {
  e.preventDefault(); coopMode = false; initSurvival();
}, { passive: false });

document.getElementById('btn-start-coop')?.addEventListener('click', () => {
  coopMode = true; initSurvival();
});
document.getElementById('btn-start-coop')?.addEventListener('touchend', e => {
  e.preventDefault(); coopMode = true; initSurvival();
}, { passive: false });

// ── Startup ───────────────────────────────────────────────────────────────────

// Fetch levels saved via the editor and merge into C.LEVEL_DATA
async function _loadLevelsFromDB() {
  try {
    const resp = await fetch('/api/levels');
    if (!resp.ok) return;
    const rows = await resp.json();
    rows.forEach(r => {
      if (typeof r.idx !== 'number' || !r.data) return;
      if (r.idx < C.LEVEL_DATA.length) {
        Object.assign(C.LEVEL_DATA[r.idx], r.data);
      } else {
        while (C.LEVEL_DATA.length <= r.idx) C.LEVEL_DATA.push(null);
        C.LEVEL_DATA[r.idx] = r.data;
      }
    });
    if (rows.length) console.log(`Loaded ${rows.length} level(s) from DB`);
  } catch (_) { /* silently fall back to built-in levels */ }
}

_showMenu();   // show menu overlay immediately
Promise.all([
  typeof Sprites !== 'undefined' && Sprites.load ? Sprites.load() : Promise.resolve(),
  _loadLevelsFromDB(),
]).finally(() => { requestAnimationFrame(loop); });
