'use strict';

// ── Canvas & scaling ─────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
let scale = 1, offX = 0, offY = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const sx  = window.innerWidth  / C.W;
  const sy  = window.innerHeight / C.H;
  scale = Math.min(sx, sy);
  const cw = C.W * scale, ch = C.H * scale;
  offX = (window.innerWidth  - cw) / 2;
  offY = (window.innerHeight - ch) / 2;
  canvas.style.width   = cw + 'px';
  canvas.style.height  = ch + 'px';
  canvas.style.left    = offX + 'px';
  canvas.style.top     = offY + 'px';
  canvas.width  = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ── Input ────────────────────────────────────────────────────────────────────
const keys = {};
const prevKeys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.code] = false; });

function keyJustPressed(code) { return keys[code] && !prevKeys[code]; }

// Touch controls
['btn-left','btn-right','btn-jump','btn-attack'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const map = { 'btn-left':'ArrowLeft','btn-right':'ArrowRight','btn-jump':'Space','btn-attack':'KeyZ' };
  el.addEventListener('touchstart', e => { e.preventDefault(); keys[map[id]] = true; }, { passive: false });
  el.addEventListener('touchend',   e => { e.preventDefault(); keys[map[id]] = false; }, { passive: false });
});

// Mouse position in logical coords
const mouse = { x: 0, y: 0 };
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left)  / scale;
  mouse.y = (e.clientY - r.top)   / scale;
});
canvas.addEventListener('touchmove', e => {
  const t = e.touches[0];
  const r = canvas.getBoundingClientRect();
  mouse.x = (t.clientX - r.left) / scale;
  mouse.y = (t.clientY - r.top)  / scale;
}, { passive: true });

// ── Game state ───────────────────────────────────────────────────────────────
const STATE = { MENU:'menu', PLAYING:'playing', GAMEOVER:'gameover',
                SUBMIT:'submit', LEADERBOARD:'leaderboard' };
let gameState = STATE.MENU;
let difficulty = 'barn';

let player, platforms, enemies, shurikens, particles, floatingTexts, petals;
let score, combo, comboTimer, lives, level, kills;
let screenFlash, nextPlatX, lastLevel;

// Camera
const cam = { x: 0, shake: 0, shakeDur: 0 };

// Score submit
let submitName = '';
let submitRank  = null;
let leaderboard = [];
let submitDone  = false;

// Name input element overlay
const nameInput = document.getElementById('name-input');
const nameForm  = document.getElementById('name-form');

// ── Init / reset ─────────────────────────────────────────────────────────────
function initGame(diff) {
  difficulty = diff;
  Audio.start();
  HUD.reset();
  UI.triggerLevelUp && (UI._levelUpTimer = 0);

  player       = new Player(difficulty);
  platforms    = [];
  enemies      = [];
  shurikens    = [];
  particles    = [];
  floatingTexts= [];
  petals       = Array.from({ length: 25 }, () => new SakuraPetal());

  score      = 0;
  combo      = 1;
  comboTimer = 0;
  lives      = C.DIFF[difficulty].lives;
  level      = 1;
  kills      = 0;
  screenFlash= 0;
  nextPlatX  = 400;
  lastLevel  = 1;

  cam.x = 0; cam.shake = 0; cam.shakeDur = 0;

  // Ground platform (virtual, never removed)
  // Real platforms start ahead
  spawnStartPlatforms();

  gameState = STATE.PLAYING;
}

function spawnStartPlatforms() {
  // A few starter platforms near the player
  for (let i = 0; i < 5; i++) {
    spawnPlatform();
  }
}

// ── Platform generation ───────────────────────────────────────────────────────
function spawnPlatform() {
  const lvlCfg  = C.LEVELS[Math.min(level - 1, C.LEVELS.length - 1)];
  const gap      = lvlCfg.gapMin + Math.random() * C.PLATFORM_GAP_EXTRA;
  const w        = C.PLATFORM_W_MIN + Math.random() * (C.PLATFORM_W_MAX - C.PLATFORM_W_MIN);
  const y        = C.H * C.PLATFORM_Y_MIN + Math.random() * C.H * (C.PLATFORM_Y_MAX - C.PLATFORM_Y_MIN);
  const x        = nextPlatX;
  nextPlatX     += w + gap;

  const plat = { x, y, w, h: 14 };
  platforms.push(plat);

  // Spawn enemy?
  const diff    = C.DIFF[difficulty];
  const speedMul = diff.speedMul;
  const shootMul = diff.shootMul;
  const lvlSpd   = lvlCfg.enemySpeed;
  const shootInt = lvlCfg.archerInterval * shootMul;

  if (Math.random() < lvlCfg.enemyRate) {
    if (level >= 2 && Math.random() < 0.3) {
      enemies.push(new Archer(x + w * 0.3, plat, speedMul, shootInt));
    } else {
      const g = new Grunt(x + w * 0.2, plat, speedMul);
      g.vx = (Math.random() > 0.5 ? 1 : -1) * lvlSpd * speedMul;
      enemies.push(g);
    }
  }
}

// ── Camera ────────────────────────────────────────────────────────────────────
function updateCamera(dt) {
  const target = player.x - C.W * 0.35;
  cam.x += (target - cam.x) * Math.min(dt * 8, 1);
  cam.x  = Math.max(0, cam.x);

  if (cam.shakeDur > 0) {
    cam.shakeDur -= dt;
    cam.shake = cam.shakeDur > 0 ? (Math.random() - 0.5) * 14 : 0;
  }
}

function triggerShake(mag, dur) { cam.shake = mag; cam.shakeDur = dur; }

// ── Platform collision ────────────────────────────────────────────────────────
function platformCollision(entity) {
  // Check elevated platforms first
  let onPlat = false;
  for (const p of platforms) {
    const prevBottom = entity.y + entity.h - entity.vy * (1/60); // approx prev
    const curBottom  = entity.y + entity.h;
    if (entity.vy >= 0 &&
        curBottom  >= p.y && curBottom  <= p.y + p.h + 12 &&
        entity.x + entity.w > p.x + 4 && entity.x < p.x + p.w - 4) {
      entity.y  = p.y - entity.h;
      entity.vy = 0;
      onPlat = true;
      if (entity === player) { player.onGround = true; player.jumpsLeft = 2; }
      break;
    }
  }
  // Ground
  if (entity.y + entity.h >= C.GROUND_Y) {
    entity.y  = C.GROUND_Y - entity.h;
    entity.vy = 0;
    if (entity === player) { player.onGround = true; player.jumpsLeft = 2; }
    onPlat = true;
  }
  return onPlat;
}

// ── Player update ─────────────────────────────────────────────────────────────
function updatePlayer(dt) {
  const p = player;

  // Horizontal
  const left  = keys['ArrowLeft']  || keys['KeyA'];
  const right = keys['ArrowRight'] || keys['KeyD'];
  p.vx = right ? C.PLAYER_SPEED : left ? -C.PLAYER_SPEED : 0;
  if (p.vx !== 0) p.facing = p.vx > 0 ? 1 : -1;

  // Jump (edge-detect)
  const jumpPressed = keyJustPressed('Space') || keyJustPressed('ArrowUp') || keyJustPressed('KeyW');
  if (jumpPressed && p.jumpsLeft > 0) {
    const wasDouble = p.jumpsLeft === 1;
    p.vy = C.JUMP_V;
    p.jumpsLeft--;
    if (wasDouble) { emitDoubleJump(particles, p.x + p.w/2, p.y + p.h); Audio.djump(); }
    else Audio.jump();
  }

  // Attack
  const attackPressed = keyJustPressed('KeyZ') || keyJustPressed('ControlLeft') || keyJustPressed('ControlRight');
  if (attackPressed && p.attackCooldown <= 0) {
    p.attacking = true;
    p.attackTimer = C.ATTACK_DURATION;
    p.attackCooldown = 0.35;
    emitSwordSlash(particles, p.x + (p.facing > 0 ? p.w + 10 : -10), p.y + p.h * 0.35, p.facing);
    Audio.slash();
  }
  if (p.attackTimer > 0)    { p.attackTimer    -= dt; if (p.attackTimer <= 0) { p.attacking = false; } }
  if (p.attackCooldown > 0)   p.attackCooldown -= dt;
  if (p.invincible > 0)       p.invincible     -= dt;

  // Gravity
  p.onGround = false;
  p.vy += C.GRAVITY * dt;
  p.x  += p.vx * dt;
  p.y  += p.vy * dt;

  platformCollision(p);

  // Kill-plane
  if (p.y > C.H + 100) damagePlayer();

  // Animation
  p.state = p.attacking ? 'attack' : p.onGround ? (Math.abs(p.vx) > 5 ? 'run' : 'idle') : 'jump';
  p.animTimer += dt;
  if (p.animTimer > 0.10) { p.animFrame = (p.animFrame + 1) % 8; p.animTimer = 0; }

  // Generate more platforms ahead
  while (nextPlatX < cam.x + C.W + 600) spawnPlatform();

  // Remove old platforms far behind
  platforms = platforms.filter(pl => pl.x + pl.w > cam.x - 400);
}

function damagePlayer() {
  if (player.invincible > 0) return;
  lives--;
  player.invincible = C.INVINCIBLE_TIME;
  screenFlash = 1;
  triggerShake(10, 0.35);
  emitHit(particles, player.x + player.w/2, player.y + player.h/2);
  Audio.hit();
  if (lives <= 0) {
    gameState = STATE.GAMEOVER;
    Audio.stop();
  }
}

// ── Enemy update ──────────────────────────────────────────────────────────────
function updateEnemies(dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.type === 'grunt') {
      e.update(dt);
    } else {
      e.update(dt, player, shurikens);
    }

    // Check player attack vs enemy
    if (player.attackActive) {
      const hb = player.attackHitbox();
      if (rectsOverlap(hb, e.bounds())) {
        if (e.type === 'archer') {
          e.hits++;
          if (e.hits < 2) { emitHit(particles, e.x + e.w/2, e.y + e.h/2); return; }
        }
        killEnemy(e);
      }
    }

    // Check enemy body vs player
    if (player.invincible <= 0 && rectsOverlap(player.bounds(), e.bounds())) {
      damagePlayer();
    }
  }
  enemies = enemies.filter(e => e.alive);
}

function killEnemy(e) {
  e.alive = false;
  kills++;
  combo = Math.min(combo + 1, C.MAX_COMBO);
  comboTimer = C.COMBO_TIMEOUT;
  const pts = 10 * combo;
  score += pts;
  emitEnemyDeath(particles, e.x + e.w/2, e.y + e.h/2);
  floatingTexts.push(new FloatingText(e.x + e.w/2, e.y - 10, `+${pts}`, C.COL_GOLD, 1 + combo * 0.15));
  if (combo > 1) floatingTexts.push(new FloatingText(e.x + e.w/2, e.y - 32, `×${combo}!`, '#ff6b35', 1.3));
  Audio.defeat();
  checkLevelUp();
}

// ── Shurikens ─────────────────────────────────────────────────────────────────
function updateShurikens(dt) {
  for (const s of shurikens) {
    s.update(dt, cam.x);
    if (s.alive && player.invincible <= 0 && rectsOverlap(player.bounds(), s.bounds())) {
      s.alive = false;
      damagePlayer();
    }
  }
  shurikens = shurikens.filter(s => s.alive);
}

// ── Level progression ─────────────────────────────────────────────────────────
function checkLevelUp() {
  const newLevel = Math.min(Math.floor(score / C.POINTS_PER_LEVEL) + 1, C.MAX_LEVEL);
  if (newLevel > level) {
    level = newLevel;
    UI.triggerLevelUp();
    triggerShake(16, 0.5);
    Audio.levelUp();
  }
}

// ── Combo decay ───────────────────────────────────────────────────────────────
function updateCombo(dt) {
  if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 1; }
}

// ── Main UPDATE ───────────────────────────────────────────────────────────────
function update(dt) {
  if (gameState !== STATE.PLAYING) return;

  updatePlayer(dt);
  updateEnemies(dt);
  updateShurikens(dt);
  updateCamera(dt);
  updateCombo(dt);

  // Particles
  for (const p of particles)    p.update(dt);
  for (const t of floatingTexts) t.update(dt);
  for (const p of petals)        p.update(dt);

  particles     = particles.filter(p => p.alive);
  floatingTexts = floatingTexts.filter(t => t.alive);

  // Screen flash decay
  screenFlash = Math.max(0, screenFlash - dt * 3.5);
}

// ── DRAW ──────────────────────────────────────────────────────────────────────
function draw(dt) {
  ctx.clearRect(0, 0, C.W, C.H);

  // ── Background layers ──
  Background.drawSky(ctx);
  Background.drawMountains(ctx, cam.x);
  Background.drawSilhouettes(ctx, cam.x);

  // ── World-space transform (camera + shake) ──
  ctx.save();
  ctx.translate(-cam.x + cam.shake, cam.shake * 0.4);

  // Ground
  Background.drawGround(ctx, cam.x);

  // Platforms
  ctx.fillStyle = '#2a2418';
  ctx.strokeStyle = C.COL_GOLD;
  ctx.lineWidth = 2;
  for (const p of platforms) {
    if (p.x + p.w < cam.x - 20 || p.x > cam.x + C.W + 20) continue;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeRect(p.x, p.y, p.w, 2);
  }
  ctx.lineWidth = 1;

  // Particles (world-space)
  for (const p of particles) p.draw(ctx);

  // Enemies
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.x + e.w < cam.x - 20 || e.x > cam.x + C.W + 20) continue;
    e.type === 'archer' ? drawArcher(ctx, e) : drawGrunt(ctx, e);
  }

  // Shurikens
  for (const s of shurikens) drawShuriken(ctx, s.x, s.y, s.rot);

  // Player
  drawNinjaPlayer(ctx, player);

  // Floating texts (world-space)
  for (const t of floatingTexts) t.draw(ctx, cam.x);

  ctx.restore(); // end world-space

  // ── Screen-space ──
  // Sakura petals
  for (const p of petals) p.draw(ctx);

  // HUD
  if (gameState === STATE.PLAYING) {
    HUD.draw(ctx, { lives, score, level, combo, difficulty });
  }

  // Screen flash
  UI.drawHitFlash(ctx, screenFlash);

  // Level-up overlay
  UI.drawLevelUp(ctx, dt, level);
}

// ── Click / tap handler ───────────────────────────────────────────────────────
let lastClickHandled = false;
canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchend', e => {
  const t = e.changedTouches[0];
  const r = canvas.getBoundingClientRect();
  mouse.x = (t.clientX - r.left) / scale;
  mouse.y = (t.clientY - r.top)  / scale;
  handleClick();
}, { passive: true });

function handleClick() {
  if (gameState === STATE.MENU) {
    const { hoverBarn, hoverVuxen } = UI.drawMenu(ctx, 0, mouse);
    if (hoverBarn)  initGame('barn');
    if (hoverVuxen) initGame('vuxen');
  } else if (gameState === STATE.GAMEOVER) {
    const { hoverSubmit, hoverRestart } = UI.drawGameOver(ctx, score, kills, level, mouse);
    if (hoverSubmit)  startSubmit();
    if (hoverRestart) initGame(difficulty);
  } else if (gameState === STATE.LEADERBOARD) {
    const { hoverBack } = UI.drawLeaderboard(ctx, leaderboard, submitRank, mouse);
    if (hoverBack) initGame(difficulty);
  }
}

// ── Score submission ──────────────────────────────────────────────────────────
function startSubmit() {
  gameState = STATE.SUBMIT;
  submitName = '';
  submitDone = false;
  if (nameForm) {
    nameForm.style.display = 'flex';
    if (nameInput) nameInput.value = '';
    nameInput && nameInput.focus();
  }
}

function finishSubmit(name) {
  if (nameForm) nameForm.style.display = 'none';
  submitName = name.trim() || 'Ninja';
  fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: submitName, score, difficulty, level, kills })
  })
    .then(r => r.json())
    .then(d => { submitRank = d.rank || null; })
    .catch(() => { submitRank = null; })
    .finally(() => {
      fetch('/api/scores').then(r => r.json()).then(rows => { leaderboard = rows; })
        .catch(() => { leaderboard = []; })
        .finally(() => { gameState = STATE.LEADERBOARD; });
    });
}

if (nameForm) {
  nameForm.addEventListener('submit', e => {
    e.preventDefault();
    finishSubmit(nameInput ? nameInput.value : '');
  });
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let lastTime = 0;

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  update(dt);
  draw(dt);

  // Overlay screens
  if (gameState === STATE.MENU)        UI.drawMenu(ctx, dt, mouse);
  if (gameState === STATE.GAMEOVER)    UI.drawGameOver(ctx, score, kills, level, mouse);
  if (gameState === STATE.SUBMIT)      UI.drawScoreSubmit(ctx);
  if (gameState === STATE.LEADERBOARD) UI.drawLeaderboard(ctx, leaderboard, submitRank, mouse);

  // Copy current keys to prev
  Object.keys(keys).forEach(k => { prevKeys[k] = keys[k]; });

  requestAnimationFrame(loop);
}

requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
