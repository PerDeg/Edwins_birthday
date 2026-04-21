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

['btn-left','btn-right','btn-jump','btn-attack','btn-throw'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const map = {
    'btn-left':   'ArrowLeft',
    'btn-right':  'ArrowRight',
    'btn-jump':   'Space',
    'btn-attack': 'KeyZ',
    'btn-throw':  'KeyX',
  };
  el.addEventListener('touchstart', e => { e.preventDefault(); keys[map[id]] = true;  }, { passive:false });
  el.addEventListener('touchend',   e => { e.preventDefault(); keys[map[id]] = false; }, { passive:false });
});

const mouse = { x: 0, y: 0 };
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) / scale;
  mouse.y = (e.clientY - r.top)  / scale;
});
canvas.addEventListener('touchmove', e => {
  const t = e.touches[0], r = canvas.getBoundingClientRect();
  mouse.x = (t.clientX - r.left) / scale;
  mouse.y = (t.clientY - r.top)  / scale;
}, { passive: true });

// ── Game state ─────────────────────────────────────────────────────────────────
const STATE = {
  MENU:           'menu',
  PLAYING:        'playing',
  GAMEOVER:       'gameover',
  SUBMIT:         'submit',
  LEADERBOARD:    'leaderboard',
  LEVEL_COMPLETE: 'level_complete',
  VICTORY:        'victory',
};
let gameState = STATE.MENU;

// ── Entity arrays ──────────────────────────────────────────────────────────────
let player        = null;
let platforms     = [], enemies = [], shurikens = [];
let particles     = [], floatingTexts = [], petals = [];
let coins         = [], pickups = [], playerShurikens = [], boss = null;
let hidingSpots   = [];

// ── Counters & flags ───────────────────────────────────────────────────────────
let score = 0, combo = 1, comboTimer = 0, lives = 0, level = 1, kills = 0;
let screenFlash      = 0;
let playerWeapon     = 'sword';   // 'sword'|'shuriken'|'triple'|'knife'
let throwCooldown    = 0;
let gemPower         = false;
let gemGlowTimer     = 0;
let currentLevelIdx  = 0;
let bgTheme          = 0;
let levelWidth       = C.LEVEL_DATA[0].width;
let levelCompleteTimer = 0;

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

function _showOverlay() {
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
  if (_menuOverlay) _menuOverlay.style.display = 'flex';
  fetchLeaderboard();
}

function _hideMenu() {
  if (_menuOverlay) _menuOverlay.style.display = 'none';
}

// ── Loop timestamp ─────────────────────────────────────────────────────────────
let lastTime = 0;

// ── Canvas UI click handler (in-game screens only) ────────────────────────────
function handleClick() {
  const b = {
    levelNext: { x: C.W * 0.5, y: C.H * 0.5 + 80,  w: 240, h: 50 },
    boardBack: { x: C.W * 0.5, y: C.H * 0.5 + 200, w: 180, h: 42 },
  };

  for (const [key, box] of Object.entries(b)) {
    const hit = mouse.x >= box.x - box.w/2 && mouse.x <= box.x + box.w/2 &&
                mouse.y >= box.y - box.h/2 && mouse.y <= box.y + box.h/2;
    if (!hit) continue;
    if (key === 'levelNext' && gameState === STATE.LEVEL_COMPLETE) advanceNextLevel();
    else if (key === 'boardBack' && gameState === STATE.LEADERBOARD) {
      _resetSubmitFlags(); _showMenu();
    }
  }
}

// ── Score submit (called by HTML overlay buttons) ─────────────────────────────
function startSubmit() {
  gameState = STATE.SUBMIT;
  submitName = ''; submitRank = null; submitDone = false;
  _showOverlay();
}

function finishSubmit(name) {
  const n = (name || '').trim();
  if (!n) return;
  submitName = n;
  const payload = { name: n, score, level, kills };
  fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(r => r.json())
    .then(d => {
      submitRank = d.rank;
      submitDone = true;
      if (_submitRankEl && _rankNum) {
        _rankNum.textContent = d.rank;
        _submitRankEl.style.display = 'block';
      }
    })
    .catch(e => console.error('Score submit error:', e));
}

function fetchLeaderboard() {
  fetch('/api/scores')
    .then(r => r.json())
    .then(d => { leaderboard = d; })
    .catch(e => console.error('Leaderboard fetch error:', e));
}

function _resetSubmitFlags() {
  _gOverShown = false; _victoryShown = false;
}

// ── Main Game Loop ─────────────────────────────────────────────────────────────
let _gOverShown = false, _victoryShown = false;
function loop(now) {
  const dt = lastTime === 0 ? 0 : Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  update(dt);
  draw(dt);

  if (gameState === STATE.LEVEL_COMPLETE && levelCompleteTimer <= 0) {
    advanceNextLevel();
  }
  if (gameState === STATE.GAMEOVER && !_gOverShown) {
    _gOverShown = true; startSubmit();
  }
  if (gameState === STATE.VICTORY && !_victoryShown) {
    _victoryShown = true; startSubmit();
  }

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
canvas.addEventListener('touchend', e => {
  const t = e.changedTouches[0];
  if (!t) return;
  const r = canvas.getBoundingClientRect();
  mouse.x = (t.clientX - r.left) / scale;
  mouse.y = (t.clientY - r.top)  / scale;
  handleClick();
});

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
  initGame();
});

document.getElementById('btn-quit')?.addEventListener('click', () => {
  _hideOverlay();
  _resetSubmitFlags();
  _showMenu();
});

// ── Menu overlay start button ─────────────────────────────────────────────────
document.getElementById('btn-start-game')?.addEventListener('click', () => {
  _hideMenu();
  _resetSubmitFlags();
  initGame();
});
document.getElementById('btn-start-game')?.addEventListener('touchend', e => {
  e.preventDefault();
  _hideMenu();
  _resetSubmitFlags();
  initGame();
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
