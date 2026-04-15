'use strict';

// ── Camera ─────────────────────────────────────────────────────────────────────
function updateCamera(dt) {
  const target = player.x - C.W * 0.35;
  cam.x += (target - cam.x) * Math.min(dt * 8, 1);
  cam.x  = Math.max(0, Math.min(levelWidth - C.W * 0.4, cam.x));
  if (cam.shakeDur > 0) {
    cam.shakeDur -= dt;
    cam.shake = cam.shakeDur > 0 ? (Math.random() - 0.5) * 14 : 0;
  } else {
    cam.shake = 0;
  }
}

// ── Platform collision ─────────────────────────────────────────────────────────
function platformCollision(entity) {
  let onPlat = false;
  for (const p of platforms) {
    const bot = entity.y + entity.h;
    if (entity.vy >= 0 &&
        bot >= p.y && bot <= p.y + p.h + 12 &&
        entity.x + entity.w > p.x + 4 && entity.x < p.x + p.w - 4) {
      entity.y = p.y - entity.h;
      entity.vy = 0;
      onPlat = true;
      if (entity === player) { player.onGround = true; player.jumpsLeft = 2; }
      break;
    }
  }
  if (entity.y + entity.h >= C.GROUND_Y) {
    entity.y  = C.GROUND_Y - entity.h;
    entity.vy = 0;
    onPlat = true;
    if (entity === player) { player.onGround = true; player.jumpsLeft = 2; }
  }
  return onPlat;
}

// ── Player update ──────────────────────────────────────────────────────────────
function updatePlayer(dt) {
  const p = player;

  const left  = keys['ArrowLeft']  || keys['KeyA'];
  const right = keys['ArrowRight'] || keys['KeyD'];
  p.vx = right ? C.PLAYER_SPEED : left ? -C.PLAYER_SPEED : 0;
  if (p.vx !== 0) p.facing = p.vx > 0 ? 1 : -1;

  const jumpPressed = keyJustPressed('Space') || keyJustPressed('ArrowUp') || keyJustPressed('KeyW');
  if (jumpPressed && p.jumpsLeft > 0) {
    const wasDouble = p.jumpsLeft === 1;
    p.vy = C.JUMP_V; p.jumpsLeft--;
    if (wasDouble) { emitDoubleJump(particles, p.x + p.w/2, p.y + p.h); Audio.djump(); }
    else Audio.jump();
  }

  const attackPressed = keyJustPressed('KeyZ') || keyJustPressed('ControlLeft') || keyJustPressed('ControlRight');
  if (attackPressed && p.attackCooldown <= 0) {
    p.attacking = true; p.attackTimer = C.ATTACK_DURATION; p.attackCooldown = 0.35;
    emitSwordSlash(particles, p.x + (p.facing > 0 ? p.w + 10 : -10), p.y + p.h * 0.35, p.facing);
    Audio.slash();
  }

  const throwPressed = keyJustPressed('KeyX') || keyJustPressed('ShiftLeft') || keyJustPressed('ShiftRight');
  if (throwPressed && throwCooldown <= 0 && playerWeapon !== 'sword') {
    throwWeapon();
    throwCooldown = C.THROW_COOLDOWN;
  }

  if (p.attackTimer > 0)    { p.attackTimer    -= dt; if (p.attackTimer  <= 0) p.attacking = false; }
  if (p.attackCooldown > 0)   p.attackCooldown -= dt;
  if (p.invincible > 0)       p.invincible     -= dt;
  if (throwCooldown > 0)      throwCooldown    -= dt;

  p.onGround = false;
  p.vy += C.GRAVITY * dt;
  p.x  += p.vx * dt;
  p.y  += p.vy * dt;

  platformCollision(p);

  if (p.y > C.H + 100) damagePlayer();

  p.state = p.attacking ? 'attack' : p.onGround ? (Math.abs(p.vx) > 5 ? 'run' : 'idle') : 'jump';
  p.animTimer += dt;
  if (p.animTimer > 0.10) { p.animFrame = (p.animFrame + 1) % 8; p.animTimer = 0; }
}

function damagePlayer() {
  if (player.invincible > 0) return;
  lives--;
  player.invincible = C.INVINCIBLE_TIME;
  screenFlash = 1;
  triggerShake(10, 0.35);
  emitHit(particles, player.x + player.w / 2, player.y + player.h / 2);
  Audio.hit();
  if (lives <= 0) { gameState = STATE.GAMEOVER; Audio.stop(); }
}

function throwWeapon() {
  const cx = player.x + player.w / 2 + player.facing * 18;
  const cy = player.y + player.h * 0.3;
  if (playerWeapon === 'triple') {
    [-0.18, 0, 0.18].forEach(a =>
      playerShurikens.push(new PlayerShuriken(cx, cy, player.facing, 'shuriken', a)));
  } else {
    playerShurikens.push(new PlayerShuriken(cx, cy, player.facing, playerWeapon === 'knife' ? 'knife' : 'shuriken'));
  }
  Audio.slash();
}

// ── Enemies ────────────────────────────────────────────────────────────────────
function updateEnemies(dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    e.type === 'grunt' ? e.update(dt) : e.update(dt, player, shurikens);

    if (player.attackActive) {
      const hb = player.attackHitbox();
      if (rectsOverlap(hb, e.bounds())) {
        if (e.type === 'archer') {
          e.hits++;
          if (e.hits < 2) { emitHit(particles, e.x + e.w/2, e.y + e.h/2); continue; }
        }
        killEnemy(e);
      }
    }
    if (player.invincible <= 0 && rectsOverlap(player.bounds(), e.bounds())) damagePlayer();
  }
  enemies = enemies.filter(e => e.alive);
}

function killEnemy(e) {
  e.alive = false; kills++;
  combo = Math.min(combo + 1, C.MAX_COMBO);
  comboTimer = C.COMBO_TIMEOUT;
  const pts = C.KILL_SCORE * combo;
  score += pts;
  emitEnemyDeath(particles, e.x + e.w / 2, e.y + e.h / 2);
  floatingTexts.push(new FloatingText(e.x + e.w/2, e.y - 10, `+${pts}`, C.COL_GOLD, 1 + combo * 0.15));
  if (combo > 1) floatingTexts.push(new FloatingText(e.x + e.w/2, e.y - 32, `×${combo}!`, '#ff6b35', 1.3));
  Audio.defeat();
}

// ── Boss ────────────────────────────────────────────────────────────────────────
function updateBoss(dt) {
  if (!boss || !boss.alive) return;
  boss.update(dt, player, shurikens);

  if (player.invincible <= 0 && rectsOverlap(player.bounds(), boss.bounds())) damagePlayer();

  if (player.attackActive) {
    const hb = player.attackHitbox();
    if (rectsOverlap(hb, boss.bounds()) && boss.takeDamage()) {
      emitHit(particles, boss.x + boss.w / 2, boss.y + boss.h / 2);
      Audio.hit();
      if (boss.hp <= 0) killBoss();
    }
  }
}

function killBoss() {
  boss.alive = false; kills++;
  score += C.BOSS_KILL_SCORE + C.LEVEL_CLEAR_BONUS;
  for (let i = 0; i < 3; i++)
    emitEnemyDeath(particles, boss.x + boss.w/2 + (i-1)*24, boss.y + boss.h/2 - i*10);
  triggerShake(22, 0.9);
  screenFlash = 1;
  Audio.defeat();
  levelCompleteTimer = 3.5;
  gameState = STATE.LEVEL_COMPLETE;
}

// ── Enemy shurikens ────────────────────────────────────────────────────────────
function updateShurikens(dt) {
  for (const s of shurikens) {
    s.update(dt, cam.x);
    if (s.alive && player.invincible <= 0 && rectsOverlap(player.bounds(), s.bounds())) {
      s.alive = false; damagePlayer();
    }
  }
  shurikens = shurikens.filter(s => s.alive);
}

// ── Player projectiles ─────────────────────────────────────────────────────────
function updatePlayerShurikens(dt) {
  for (const s of playerShurikens) {
    s.update(dt);
    if (!s.alive) continue;

    if (boss && boss.alive && !s.hitSet.has(boss) && rectsOverlap(s.bounds(), boss.bounds())) {
      if (boss.takeDamage()) {
        emitHit(particles, boss.x + boss.w/2, boss.y + boss.h/2);
        if (boss.hp <= 0) killBoss();
      }
      if (!s.piercing) { s.alive = false; continue; }
      s.hitSet.add(boss);
    }

    for (const e of enemies) {
      if (!e.alive || s.hitSet.has(e) || !s.alive) continue;
      if (rectsOverlap(s.bounds(), e.bounds())) {
        if (e.type === 'archer') {
          e.hits++;
          if (e.hits < 2) emitHit(particles, e.x + e.w/2, e.y + e.h/2);
          else killEnemy(e);
        } else {
          killEnemy(e);
        }
        if (!s.piercing) { s.alive = false; break; }
        s.hitSet.add(e);
      }
    }
  }
  playerShurikens = playerShurikens.filter(s => s.alive);
}

// ── Coins ──────────────────────────────────────────────────────────────────────
function updateCoins(dt) {
  for (const c of coins) {
    if (!c.alive) continue;
    c.update(dt);
    if (rectsOverlap(player.bounds(), c.bounds())) {
      c.alive = false;
      score += C.COIN_VALUE;
      Audio.coin();
      floatingTexts.push(new FloatingText(c.x + c.w/2, c.y - 8, `+${C.COIN_VALUE}`, '#ffd700', 0.85));
    }
  }
}

// ── Pickups ────────────────────────────────────────────────────────────────────
function updatePickups(dt) {
  const labels = { shuriken: 'KASTSTJÄRNA!', triple: '3× STJÄRNA!', knife: 'KNIV!' };
  for (const p of pickups) {
    if (!p.alive) continue;
    p.update(dt);
    if (rectsOverlap(player.bounds(), p.bounds())) {
      p.alive = false;
      playerWeapon = p.type;
      floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 10,  labels[p.type] || p.type, '#4fc3f7', 1.2));
      floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 30, 'TRYCK X FÖR ATT KASTA', 'rgba(255,255,255,0.75)', 0.78));
      Audio.djump();
    }
  }
}

// ── Combo ──────────────────────────────────────────────────────────────────────
function updateCombo(dt) {
  if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 1; }
}

// ── Main update ────────────────────────────────────────────────────────────────
function update(dt) {
  if (gameState === STATE.LEVEL_COMPLETE) {
    levelCompleteTimer -= dt;
    for (const p of particles)     p.update(dt);
    for (const t of floatingTexts) t.update(dt);
    for (const p of petals)        p.update(dt);
    particles     = particles.filter(p => p.alive);
    floatingTexts = floatingTexts.filter(t => t.alive);
    return;
  }
  if (gameState !== STATE.PLAYING) return;

  updatePlayer(dt);
  updateEnemies(dt);
  updateShurikens(dt);
  updatePlayerShurikens(dt);
  updateBoss(dt);
  updateCoins(dt);
  updatePickups(dt);
  updateCamera(dt);
  updateCombo(dt);

  for (const p of particles)     p.update(dt);
  for (const t of floatingTexts) t.update(dt);
  for (const p of petals)        p.update(dt);

  particles     = particles.filter(p => p.alive);
  floatingTexts = floatingTexts.filter(t => t.alive);
  screenFlash   = Math.max(0, screenFlash - dt * 3.5);
}
