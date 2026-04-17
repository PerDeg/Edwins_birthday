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

  const left         = keys['ArrowLeft']  || keys['KeyA'];
  const right        = keys['ArrowRight'] || keys['KeyD'];
  const downJust     = keyJustPressed('ArrowDown') || keyJustPressed('KeyS');
  const jumpPressed  = keyJustPressed('Space') || keyJustPressed('ArrowUp') || keyJustPressed('KeyW');
  const attackPressed = keyJustPressed('KeyZ') || keyJustPressed('ControlLeft') || keyJustPressed('ControlRight');

  // ── Hiding mechanic ─────────────────────────────────────────────────────
  if (!p.hiding) {
    if (downJust && p.onGround) {
      const nearSpot = hidingSpots.find(s =>
        Math.abs((p.x + p.w / 2) - (s.x + s.w / 2)) < C.HIDE_RANGE &&
        Math.abs((p.y + p.h) - (s.y + s.h)) < 24
      );
      if (nearSpot) {
        p.hiding = true; p.hidingAt = nearSpot;
        p.x = nearSpot.x + (nearSpot.w - p.w) / 2;
      }
    }
  } else if (left || right || jumpPressed || attackPressed || downJust) {
    p.hiding = false; p.hidingAt = null;
  }

  if (p.hiding) {
    p.vx = 0;
    p.vy += C.GRAVITY * dt;
    p.y  += p.vy * dt;
    platformCollision(p);
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.invincible > 0)     p.invincible     -= dt;
    if (throwCooldown > 0)    throwCooldown    -= dt;
    p.state = 'idle'; p.prevState = 'idle';
    p.animTimer += dt;
    if (p.animTimer > 0.10) { p.animFrame++; p.animTimer = 0; }
    return;
  }

  const crouch = keys['ArrowDown']  || keys['KeyS'];
  p.crouching  = !!(crouch && p.onGround);
  const spd    = p.crouching ? C.CROUCH_SPEED : C.PLAYER_SPEED;
  p.vx = right ? spd : left ? -spd : 0;
  if (p.vx !== 0) p.facing = p.vx > 0 ? 1 : -1;

  if (jumpPressed && p.jumpsLeft > 0) {
    const wasDouble = p.jumpsLeft === 1;
    p.vy = C.JUMP_V; p.jumpsLeft--;
    if (wasDouble) { emitDoubleJump(particles, p.x + p.w/2, p.y + p.h); Audio.djump(); }
    else Audio.jump();
  }

  if (attackPressed && p.attackCooldown <= 0) {
    if (gemPower) {
      triggerGemSpecial();
    } else {
      p.attacking = true; p.attackTimer = C.ATTACK_DURATION; p.attackCooldown = 0.35;
      emitSwordSlash(particles, p.x + (p.facing > 0 ? p.w + 10 : -10), p.y + p.h * 0.35, p.facing);
      Audio.slash();
    }
  }

  const throwPressed = keyJustPressed('KeyX') || keyJustPressed('ShiftLeft') || keyJustPressed('ShiftRight');
  if (throwPressed && throwCooldown <= 0 && playerWeapon !== 'sword') {
    const throwX = p.x + p.w / 2 + p.facing * 18;
    if (throwX > cam.x + 20 && throwX < cam.x + C.W - 20) {
      throwWeapon();
      throwCooldown = C.THROW_COOLDOWN;
    }
  }

  if (p.attackTimer > 0)    { p.attackTimer    -= dt; if (p.attackTimer  <= 0) p.attacking = false; }
  if (p.attackCooldown > 0)   p.attackCooldown -= dt;
  if (p.invincible > 0)       p.invincible     -= dt;
  if (throwCooldown > 0)      throwCooldown    -= dt;

  p.onGround = false;
  p.vy += C.GRAVITY * dt;
  p.x  += p.vx * dt;
  p.y  += p.vy * dt;

  if (p.x < cam.x) { p.x = cam.x; if (p.vx < 0) p.vx = 0; }

  platformCollision(p);

  if (p.y > C.H + 100) damagePlayer();

  p.state = p.attacking ? 'attack' : p.crouching ? 'crouch' : p.onGround ? (Math.abs(p.vx) > 5 ? 'run' : 'idle') : 'jump';
  if (p.state !== p.prevState) { p.animFrame = 0; p.animTimer = 0; p.prevState = p.state; }
  p.animTimer += dt;
  if (p.animTimer > 0.10) { p.animFrame++; p.animTimer = 0; }
}

function damagePlayer() {
  if (player.invincible > 0) return;
  lives--;
  combo = 1; comboTimer = 0;
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

// ── Gem special attack ─────────────────────────────────────────────────────────
function triggerGemSpecial() {
  gemPower = false;
  gemGlowTimer = 0;
  screenFlash = 0.6;
  triggerShake(8, 0.3);
  Audio.levelUp();
  // Deal 2 hits to every visible enemy
  const visL = cam.x - 40, visR = cam.x + C.W + 40;
  for (const e of enemies) {
    if (!e.alive || e.x + e.w < visL || e.x > visR) continue;
    if (e.type === 'archer') {
      e.hits += 2;
      if (e.hits >= 2) killEnemy(e);
      else emitHit(particles, e.x + e.w/2, e.y + e.h/2);
    } else {
      killEnemy(e);
    }
    emitEnemyDeath(particles, e.x + e.w/2, e.y + e.h/2);
  }
  if (boss && boss.alive && boss.x + boss.w > visL && boss.x < visR) {
    boss.takeDamage(); boss.takeDamage();
    emitHit(particles, boss.x + boss.w/2, boss.y + boss.h/2);
    if (boss.hp <= 0) killBoss();
  }
}

// ── Enemies ────────────────────────────────────────────────────────────────────
function updateEnemies(dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    // Skip enemies far off-screen that can't possibly interact with the player.
    // Detection range is 230px so a 450px margin is safe. Always update alert grunts.
    const nearViewport = e.x + e.w > cam.x - 450 && e.x < cam.x + C.W + 450;
    if (!nearViewport && (e.type !== 'grunt' || e.aiState === 'patrol')) continue;
    if (e.type === 'grunt') {
      e.updateStealth(dt, player);
      e.update(dt, player);
    } else {
      e.update(dt, player, shurikens);
    }

    if (player.attackActive) {
      const hb = player.attackHitbox();
      if (rectsOverlap(hb, e.bounds())) {
        if (e.type === 'grunt' && e.aiState !== 'alert' && e.isBehind(player)) {
          killEnemy(e, true);   // stealth kill from behind
        } else if (e.type === 'archer') {
          e.hits++;
          if (e.hits < 2) { emitHit(particles, e.x + e.w/2, e.y + e.h/2); continue; }
          killEnemy(e);
        } else {
          killEnemy(e);
        }
      }
    }
    if (player.invincible <= 0 && rectsOverlap(player.bounds(), e.bounds())) damagePlayer();
  }
  enemies = enemies.filter(e => e.alive);
}

function killEnemy(e, stealth = false) {
  e.alive = false; kills++;
  combo = Math.min(combo + 1, C.MAX_COMBO);
  comboTimer = C.COMBO_TIMEOUT;
  const basePts = C.KILL_SCORE * combo;
  const pts     = stealth ? basePts + C.STEALTH_KILL_BONUS : basePts;
  score += pts;
  emitEnemyDeath(particles, e.x + e.w / 2, e.y + e.h / 2);
  floatingTexts.push(new FloatingText(e.x + e.w/2, e.y - 10, `+${pts}`, C.COL_GOLD, 1 + combo * 0.15));
  if (stealth) {
    floatingTexts.push(new FloatingText(e.x + e.w/2, e.y - 34, 'STEALTH KILL!', '#a0f0ff', 1.35));
  } else if (combo > 1) {
    floatingTexts.push(new FloatingText(e.x + e.w/2, e.y - 32, `×${combo}!`, '#ff6b35', 1.3));
  }
  // Normal kills alert nearby guards (stealth kills are silent)
  if (!stealth) {
    for (const other of enemies) {
      if (!other.alive || other === e || other.type !== 'grunt') continue;
      if (Math.hypot(other.x - e.x, other.y - e.y) < 260) {
        other.aiState = 'alert'; other.detectTimer = C.DETECTION_TIME;
      }
    }
  }
  Audio.defeat();
}

// ── Boss ────────────────────────────────────────────────────────────────────────
function updateBoss(dt) {
  if (!boss || !boss.alive) return;
  boss.update(dt, player, shurikens, playerShurikens);

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
    // Mark heart as gem-version when player is at full life (for draw)
    if (p.type === 'heart') p.isGem = (lives >= C.LIVES);
    p.update(dt);
    if (rectsOverlap(player.bounds(), p.bounds())) {
      p.alive = false;
      if (p.type === 'heart') {
        if (lives < C.LIVES) {
          lives++;
          floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 10, '+1 LIV!', '#e63946', 1.3));
          Audio.levelUp();
        } else {
          // Full health — grant gem power
          gemPower = true;
          gemGlowTimer = 8.0;   // 8 seconds of glow
          floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 10, 'GEM-KRAFT!', '#a0f0ff', 1.4));
          floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 32, 'TRYCK Z FÖR ATTACK!', 'rgba(160,240,255,0.85)', 0.85));
          Audio.levelUp();
        }
      } else {
        playerWeapon = p.type;
        floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 10, labels[p.type] || p.type, '#4fc3f7', 1.2));
        floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 30, 'TRYCK X FÖR ATT KASTA', 'rgba(255,255,255,0.75)', 0.78));
        Audio.djump();
      }
    }
  }
}

// ── Combo ──────────────────────────────────────────────────────────────────────
function updateCombo(dt) {
  if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 1; }
}

// ── Gem glow timer ─────────────────────────────────────────────────────────────
function updateGem(dt) {
  if (gemGlowTimer > 0) {
    gemGlowTimer -= dt;
    if (gemGlowTimer <= 0) { gemPower = false; gemGlowTimer = 0; }
  }
}

// ── Main update ────────────────────────────────────────────────────────────────
function update(dt) {
  if (gameState === STATE.LEVEL_COMPLETE) {
    levelCompleteTimer -= dt;
    for (const p of particles)     p.update(dt);
    for (const t of floatingTexts) t.update(dt);
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
  updatePickups(dt);
  updateCamera(dt);
  updateCombo(dt);
  updateGem(dt);

  for (const p of particles)     p.update(dt);
  for (const t of floatingTexts) t.update(dt);
  for (const p of petals)        p.update(dt);

  particles     = particles.filter(p => p.alive);
  if (particles.length > 220) particles = particles.slice(-220);   // hard cap
  floatingTexts = floatingTexts.filter(t => t.alive);
  screenFlash   = Math.max(0, screenFlash - dt * 3.5);
}
