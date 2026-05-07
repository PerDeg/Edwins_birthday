'use strict';

// ── Moving platforms ───────────────────────────────────────────────────────────
function updateMovingPlatforms(dt) {
  for (const p of movingPlatforms) {
    const prev = p.axis === 'x' ? p.x : p.y;
    const move = p.moveDir * p.speed * dt;
    if (p.axis === 'x') {
      p.x += move;
      p._deltaX = p.x - prev;
      p._deltaY = 0;
      if (Math.abs(p.x - p.originX) >= p.range) {
        p.moveDir *= -1;
        p.x = p.originX + p.moveDir * -p.range;
      }
    } else {
      p.y += move;
      p._deltaX = 0;
      p._deltaY = p.y - prev;
      if (Math.abs(p.y - p.originY) >= p.range) {
        p.moveDir *= -1;
        p.y = p.originY + p.moveDir * -p.range;
      }
    }
  }
}

// ── Camera ─────────────────────────────────────────────────────────────────────
function updateCamera(dt) {
  const target = player.x - C.W * 0.35;
  const newX   = cam.x + (target - cam.x) * Math.min(dt * 8, 1);
  // Ratchet: camera only advances forward, never scrolls back
  cam.x = Math.max(cam.x, Math.max(0, Math.min(levelWidth - C.W * 0.4, newX)));
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
  if (entity === player) player._standingPlat = null;
  for (const p of platforms) {
    const bot = entity.y + entity.h;
    if (entity.vy >= 0 &&
        bot >= p.y && bot <= p.y + p.h + 12 &&
        entity.x + entity.w > p.x + 4 && entity.x < p.x + p.w - 4) {
      entity.y = p.y - entity.h;
      entity.vy = 0;
      onPlat = true;
      if (entity === player) { player.onGround = true; player.jumpsLeft = 2; player._standingPlat = p; }
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

  // ── Dash: double-tap detection ──────────────────────────────────────────
  const leftJust  = keyJustPressed('ArrowLeft')  || keyJustPressed('KeyA');
  const rightJust = keyJustPressed('ArrowRight') || keyJustPressed('KeyD');
  if (p.tapLeftTimer  > 0) p.tapLeftTimer  -= dt;
  if (p.tapRightTimer > 0) p.tapRightTimer -= dt;
  if (p.dashCooldown  > 0) p.dashCooldown  -= dt;
  if (!p.dashing && p.dashCooldown <= 0) {
    const dir = (rightJust && p.tapRightTimer > 0) ? 1
              : (leftJust  && p.tapLeftTimer  > 0) ? -1 : 0;
    if (dir !== 0) {
      p.dashing = true; p.dashDir = dir;
      p.dashTimer   = C.DASH_DURATION;
      p.dashHitSet  = new Set();
      p.dashCooldown = C.DASH_COOLDOWN;
      p.vy = Math.min(p.vy, -80);  // small upward kick at start
      emitDashFire(particles, p.x + p.w / 2, p.y + p.h / 2, dir);
      emitDashFire(particles, p.x + p.w / 2, p.y + p.h / 2, dir);
      Audio.slash();
    }
  }
  if (rightJust) p.tapRightTimer = C.DASH_TAP_WIN;
  if (leftJust)  p.tapLeftTimer  = C.DASH_TAP_WIN;

  // ── Dashing ─────────────────────────────────────────────────────────────
  if (p.dashing) {
    p.dashTimer -= dt;
    if (p.dashTimer > 0) {
      p.x  += p.dashDir * C.DASH_SPEED * dt;
      p.vy += C.GRAVITY * 0.12 * dt;   // near-weightless arc during lunge
      p.y  += p.vy * dt;
      if (p.x < cam.x) p.x = cam.x;
      platformCollision(p);
      if (p.y > C.H + 100) { playerHp = 0; gameState = STATE.GAMEOVER; Audio.stop(); return; }

      emitDashFire(particles, p.x + p.w / 2, p.y + p.h / 2, p.dashDir);

      for (const e of enemies) {
        if (!e.alive || p.dashHitSet.has(e)) continue;
        if (rectsOverlap(p.bounds(), e.bounds())) {
          p.dashHitSet.add(e);
          e.hp -= C.DASH_DAMAGE;
          e.hitFlash = 0.14;
          e.vx = p.dashDir * 320;   // knock back
          e.vy = -220;              // knock up
          emitDashImpact(particles, e.x + e.w / 2, e.y + e.h / 2, p.dashDir);
          screenFlash = Math.max(screenFlash, 0.45);
          triggerShake(9, 0.22);
          Audio.hit();
          if (e.hp <= 0) killEnemy(e);
          else if (e.type === 'grunt') { e.aiState = 'alert'; e.detectTimer = C.DETECTION_TIME; }
        }
      }
      if (boss && boss.alive && !p.dashHitSet.has(boss) && rectsOverlap(p.bounds(), boss.bounds())) {
        p.dashHitSet.add(boss);
        boss.takeDamage();
        boss.takeDamage();
        emitDashImpact(particles, boss.x + boss.w / 2, boss.y + boss.h / 2, p.dashDir);
        screenFlash = Math.max(screenFlash, 0.45);
        triggerShake(9, 0.22);
        Audio.hit();
        if (boss.hp <= 0) killBoss();
      }

      p.facing    = p.dashDir;
      p.state     = 'attack'; p.prevState = 'attack';
      p.animTimer += dt;
      if (p.animTimer > 0.06) { p.animFrame++; p.animTimer = 0; }
      if (p.invincible > 0)     p.invincible     -= dt;
      if (p.attackCooldown > 0) p.attackCooldown -= dt;
      if (throwCooldown > 0)    throwCooldown    -= dt;
      if (ammoDisplayTimer > 0) ammoDisplayTimer  = Math.max(0, ammoDisplayTimer - dt);
      return;
    }
    p.dashing = false;   // dash expired — fall through to normal physics this frame
  }

  // ── Ladder detection ────────────────────────────────────────────────────
  if (p.ladderCooldown > 0) p.ladderCooldown -= dt;
  p.onLadder = false;
  let _activeLadder = null;
  const _lcx = p.x + p.w / 2;
  for (const l of ladders) {
    if (_lcx > l.x && _lcx < l.x + l.w && p.y + p.h > l.y && p.y < l.y + l.h) {
      if (p.ladderCooldown <= 0) { p.onLadder = true; _activeLadder = l; }
      break;
    }
  }

  const crouch = keys['ArrowDown']  || keys['KeyS'];
  p.crouching  = !!(crouch && p.onGround && !p.onLadder);
  const spd    = p.crouching ? C.CROUCH_SPEED : C.PLAYER_SPEED;
  p.vx = right ? spd : left ? -spd : 0;
  if (p.vx !== 0) p.facing = p.vx > 0 ? 1 : -1;

  if (jumpPressed && p.jumpsLeft > 0) {
    // On ladder: only Space jumps off; ArrowUp/W climb instead of jump
    const allowJump = !p.onLadder || keyJustPressed('Space');
    if (allowJump) {
      const wasDouble = p.jumpsLeft === 1;
      p.vy = C.JUMP_V; p.jumpsLeft--;
      if (p.onLadder) { p.onLadder = false; p.ladderCooldown = 0.4; _activeLadder = null; }
      if (wasDouble) { emitDoubleJump(particles, p.x + p.w/2, p.y + p.h); Audio.djump(); }
      else Audio.jump();
    }
  }

  // Ground pound — down-press in air drops fast and smashes enemies on landing
  if (downJust && !p.onGround && !p.onLadder && !p.groundPound) {
    p.groundPound = true;
    p.vy = Math.max(p.vy, 580);
    emitDust(particles, p.x + p.w / 2, p.y + p.h);
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
  if (throwPressed && throwCooldown <= 0 && playerWeapon !== 'sword' && throwAmmo > 0) {
    throwWeapon();
    throwCooldown = C.THROW_COOLDOWN;
  }

  if (p.attackTimer > 0)    { p.attackTimer    -= dt; if (p.attackTimer  <= 0) p.attacking = false; }
  if (p.attackCooldown > 0)   p.attackCooldown -= dt;
  if (p.invincible > 0)       p.invincible     -= dt;
  if (throwCooldown > 0)      throwCooldown    -= dt;

  // Ladder climbing overrides normal gravity
  p.onGround = false;
  if (p.onLadder) {
    const climbUp   = keys['ArrowUp']   || keys['KeyW'];
    const climbDown = keys['ArrowDown'] || keys['KeyS'];
    p.vy = climbUp ? -C.LADDER_SPEED : climbDown ? C.LADDER_SPEED : 0;
    p.x  = _activeLadder.x + (_activeLadder.w - p.w) / 2;  // centre on ladder
    p.jumpsLeft = Math.max(p.jumpsLeft, 1);
  } else {
    const jumpHeld = !!(keys['Space'] || keys['ArrowUp'] || keys['KeyW']);
    p.vy += C.GRAVITY * ((!jumpHeld && p.vy < 0) ? 3.5 : 1.0) * dt;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  if (p.x < cam.x) { p.x = cam.x; if (p.vx < 0) p.vx = 0; }

  platformCollision(p);

  if (p.y > C.H + 100) { playerHp = 0; gameState = STATE.GAMEOVER; Audio.stop(); }

  // Moving platform: carry player with platform
  if (p._standingPlat && p._standingPlat.moving) {
    p.x += p._standingPlat._deltaX;
    p.y += p._standingPlat._deltaY;
  }

  const prevState = p.prevState;
  p.state = p.attacking ? 'attack' : p.crouching ? 'crouch' : p.onGround ? (Math.abs(p.vx) > 5 ? 'run' : 'idle') : 'jump';
  if (p.state !== prevState) { p.animFrame = 0; p.animTimer = 0; p.prevState = p.state; }

  // Landing impact + ground pound hit
  if (p.state === 'idle' || p.state === 'run') {
    if (prevState === 'jump' && p._prevVy > 220) {
      emitLandingImpact(particles, p.x + p.w / 2, p.y + p.h, p._prevVy);
      if (p._prevVy > 400) triggerShake(4, 0.12);
    }
    if (p.groundPound) {
      p.groundPound = false;
      triggerShake(9, 0.28);
      emitLandingImpact(particles, p.x + p.w / 2, p.y + p.h, 700);
      Audio.hit();
      const GP_RANGE = 80;
      const pcx = p.x + p.w / 2;
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = Math.abs((e.x + e.w / 2) - pcx);
        const dy = e.y + e.h / 2 - (p.y + p.h);
        if (dx < GP_RANGE && dy > -50 && dy < 90) {
          e.hp--;
          e.hitFlash = 0.15;
          e.vx = (e.x < p.x ? -1 : 1) * 240;
          e.vy = -300;
          emitHit(particles, e.x + e.w / 2, e.y + e.h / 2);
          if (e.hp <= 0) killEnemy(e);
        }
      }
      if (boss && boss.alive) {
        const dx = Math.abs((boss.x + boss.w / 2) - pcx);
        if (dx < GP_RANGE + 30) {
          boss.takeDamage();
          emitHit(particles, boss.x + boss.w / 2, boss.y + boss.h / 2);
          if (boss.hp <= 0) killBoss();
        }
      }
    }
  }
  p._prevVy = p.vy;

  // Footstep dust while running
  if (p.state === 'run' && p.onGround) {
    p._dustTimer = (p._dustTimer || 0) - dt;
    if (p._dustTimer <= 0) {
      emitDust(particles, p.x + p.w / 2, p.y + p.h);
      p._dustTimer = 0.14;
    }
  } else { p._dustTimer = 0; }

  p.animTimer += dt;
  if (p.animTimer > 0.10) { p.animFrame++; p.animTimer = 0; }
}

function damagePlayer() {
  if (player.invincible > 0) return;
  playerHp = Math.max(0, playerHp - C.CONTACT_DAMAGE);
  combo = 1; comboTimer = 0;
  player.invincible = C.INVINCIBLE_TIME;
  screenFlash = 1;
  triggerShake(10, 0.35);
  emitHit(particles, player.x + player.w / 2, player.y + player.h / 2);
  Audio.hit();
  if (playerHp <= 0) { gameState = STATE.GAMEOVER; Audio.stop(); }
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
  throwAmmo--;
  if (throwAmmo <= 0) { throwAmmo = 0; playerWeapon = 'sword'; }
  ammoDisplayTimer = 1.8;
  Audio.slash();
}

// ── Gem special attack ─────────────────────────────────────────────────────────
const GEM_SPECIAL_RANGE = 290;

function triggerGemSpecial() {
  gemPower = false;
  gemGlowTimer = 0;
  screenFlash = 0.55;
  triggerShake(8, 0.28);
  Audio.levelUp();

  const pcx = player.x + player.w / 2;
  const pcy = player.y + player.h / 2;

  // Launch expanding ring visual
  gemWave = { x: pcx, y: pcy, r: 10, maxR: GEM_SPECIAL_RANGE, timer: 0.55 };

  // Particle burst at origin
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const spd = 120 + Math.random() * 200;
    particles.push(new Particle(pcx, pcy, Math.cos(a)*spd, Math.sin(a)*spd,
      Math.random() > 0.5 ? '#a0f0ff' : '#ffffff', 3 + Math.random()*4, 0.45, 0));
  }

  // Hit enemies within radius, staggered by distance for wave feel
  const hits = enemies
    .filter(e => e.alive)
    .map(e => ({ e, dist: Math.hypot(e.x + e.w/2 - pcx, e.y + e.h/2 - pcy) }))
    .filter(({dist}) => dist < GEM_SPECIAL_RANGE)
    .sort((a, b) => a.dist - b.dist);

  hits.forEach(({ e }) => {
    e.hp--;
    e.hitFlash = 0.15;
    const ang = Math.atan2(e.y + e.h/2 - pcy, e.x + e.w/2 - pcx);
    e.vx = Math.cos(ang) * 280;
    e.vy = Math.sin(ang) * 280 - 100;
    if (e.hp <= 0) { killEnemy(e); emitEnemyDeath(particles, e.x + e.w/2, e.y + e.h/2); }
    else emitHit(particles, e.x + e.w/2, e.y + e.h/2);
  });

  if (boss && boss.alive && Math.hypot(boss.x + boss.w/2 - pcx, boss.y + boss.h/2 - pcy) < GEM_SPECIAL_RANGE) {
    boss.takeDamage();
    emitHit(particles, boss.x + boss.w/2, boss.y + boss.h/2);
    if (boss.hp <= 0) killBoss();
  }
}

// ── Enemies ────────────────────────────────────────────────────────────────────
function updateEnemies(dt) {
  for (const e of enemies) {
    if (e.dying) {
      e.dyingTimer -= dt;
      e.vy += C.GRAVITY * dt;
      e.x  += e.vx * dt;
      e.y  += e.vy * dt;
      e.dyingRot = (e.dyingRot || 0) + e.dyingRotSpd * dt;
      continue;
    }
    if (!e.alive) continue;
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
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

    // Capture overlap BEFORE push-out — push moves player to exact edge so
    // rectsOverlap returns false afterwards, which would suppress contact damage.
    // Dashing player powers through enemies — skip push-out entirely.
    const wasOverlapping = !player.hiding && !player.dashing && rectsOverlap(player.bounds(), e.bounds());
    if (wasOverlapping) {
      const overlapL = (e.x + e.w) - player.x;
      const overlapR = (player.x + player.w) - e.x;
      if (overlapL < overlapR) {
        player.x = e.x + e.w;
        player.facing = -1;
        if (player.vx < 0) player.vx = 0;
      } else {
        player.x = e.x - player.w;
        player.facing = 1;
        if (player.vx > 0) player.vx = 0;
      }
    }
    if (player.attackActive) {
      const hb = player.attackHitbox();
      if (rectsOverlap(hb, e.bounds())) {
        if (e.type === 'grunt' && e.aiState !== 'alert' && e.isBehind(player)) {
          killEnemy(e, true);
        } else {
          e.hp--;
          e.hitFlash = 0.12;
          emitHit(particles, e.x + e.w/2, e.y + e.h/2);
          if (e.hp <= 0) killEnemy(e);
          else if (e.type === 'grunt') { e.aiState = 'alert'; e.detectTimer = C.DETECTION_TIME; }
        }
      }
    }
    // Alert grunts and archers deal contact damage
    const dealsDmg = e.type === 'archer' || (e.type === 'grunt' && e.aiState === 'alert');
    if (dealsDmg && wasOverlapping && player.invincible <= 0) damagePlayer();
  }
  enemies = enemies.filter(e => e.alive || (e.dying && e.dyingTimer > 0));
}

function killEnemy(e, stealth = false) {
  e.alive   = false;
  e.dying   = true;
  e.dyingTimer  = 0.55;
  e.vx      = (player ? player.facing * 160 : 0) + (Math.random() - 0.5) * 60;
  e.vy      = -290 - Math.random() * 90;
  e.dyingRot    = 0;
  e.dyingRotSpd = (Math.random() > 0.5 ? 1 : -1) * (7 + Math.random() * 9);
  kills++;
  combo = Math.min(combo + 1, C.MAX_COMBO);
  comboTimer = C.COMBO_TIMEOUT;
  const basePts = C.KILL_SCORE * combo;
  const pts     = stealth ? basePts + C.STEALTH_KILL_BONUS : basePts;
  score += pts;
  emitEnemyDeath(particles, e.x + e.w / 2, e.y + e.h / 2);
  if (combo >= 4) {
    // Extra burst at high combo
    emitEnemyDeath(particles, e.x + e.w / 2, e.y + e.h / 2);
    emitDashFire(particles, e.x + e.w / 2, e.y + e.h / 2, player ? player.facing : 1);
  }
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
  if (!boss.seenByPlayer && boss.x < cam.x + C.W && boss.x + boss.w > cam.x) {
    boss.seenByPlayer = true;
    Audio.bossFight();
  }
  boss.update(dt, player, shurikens, playerShurikens);
  if (boss.hitFlash > 0) boss.hitFlash = Math.max(0, boss.hitFlash - dt);

  // Phase 2 transition announcement
  if (boss.phase2 && !boss.phase2Announced) {
    boss.phase2Announced = true;
    screenFlash = Math.max(screenFlash, 0.7);
    triggerShake(14, 0.5);
    floatingTexts.push(new FloatingText(boss.x + boss.w / 2, boss.y - 40, 'FAS 2!!', '#ff2020', 2.2));
    floatingTexts.push(new FloatingText(boss.x + boss.w / 2, boss.y - 70, '⚡ PASSA DIG!', '#ffaa00', 1.4));
    emitEnemyDeath(particles, boss.x + boss.w / 2, boss.y + boss.h / 2);
    emitEnemyDeath(particles, boss.x + boss.w / 2, boss.y + boss.h / 2);
  }

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
  slowMoTimer = C.SLOW_MO_DURATION;
  Audio.stopBoss();
  score += C.BOSS_KILL_SCORE + C.LEVEL_CLEAR_BONUS;
  for (let i = 0; i < 6; i++)
    emitEnemyDeath(particles, boss.x + boss.w/2 + (i-2)*20, boss.y + boss.h/2 - i*8);
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
    if (s.alive && !player.hiding && player.invincible <= 0 && rectsOverlap(player.bounds(), s.bounds())) {
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
      if (boss.shieldActive) {
        // Shield blocks thrown weapons — spark and sound
        s.alive = false;
        emitHit(particles, s.x, s.y);
        Audio.shieldBlock();
        triggerShake(3, 0.12);
      } else if (boss.takeDamage()) {
        emitHit(particles, boss.x + boss.w/2, boss.y + boss.h/2);
        if (boss.hp <= 0) killBoss();
        if (!s.piercing) { s.alive = false; continue; }
        s.hitSet.add(boss);
      } else {
        if (!s.piercing) { s.alive = false; continue; }
        s.hitSet.add(boss);
      }
    }

    for (const e of enemies) {
      if (!e.alive || s.hitSet.has(e) || !s.alive) continue;
      if (rectsOverlap(s.bounds(), e.bounds())) {
        e.hp--;
        e.hitFlash = 0.12;
        emitHit(particles, e.x + e.w/2, e.y + e.h/2);
        if (e.hp <= 0) {
          killEnemy(e);
        } else if (e.type === 'grunt') {
          e.aiState = 'alert'; e.detectTimer = C.DETECTION_TIME;
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
  const MAGNET_RANGE = 130;
  const mpx = player.x + player.w / 2, mpy = player.y + player.h / 2;
  for (const c of coins) {
    if (!c.alive) continue;
    c.update(dt);
    // Magnetic attraction
    const cdx = (c.x + c.w / 2) - mpx, cdy = (c.y + c.h / 2) - mpy;
    const dist = Math.hypot(cdx, cdy);
    if (dist < MAGNET_RANGE && dist > 1) {
      const spd = 320 * (1 - dist / MAGNET_RANGE);
      c.x -= (cdx / dist) * spd * dt;
      c.y -= (cdy / dist) * spd * dt;
    }
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
    // Mark heart as gem-version when player is at full health (for draw)
    if (p.type === 'heart') p.isGem = (playerHp >= C.PLAYER_HP);
    p.update(dt);
    if (rectsOverlap(player.bounds(), p.bounds())) {
      p.alive = false;
      if (p.type === 'heart') {
        if (playerHp < C.PLAYER_HP) {
          playerHp = Math.min(C.PLAYER_HP, playerHp + C.HEART_HEAL);
          floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 10, `+${C.HEART_HEAL}% LIV`, '#e63946', 1.3));
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
        throwAmmo = C.THROW_AMMO;
        floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 10, labels[p.type] || p.type, '#4fc3f7', 1.2));
        floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 30, `TRYCK X  ×${C.THROW_AMMO}`, 'rgba(255,255,255,0.75)', 0.78));
        Audio.djump();
      }
    }
  }
}

// ── Spikes ─────────────────────────────────────────────────────────────────────
function updateSpikes() {
  if (!player || player.hiding || player.invincible > 0) return;
  for (const s of spikes) {
    if (rectsOverlap(player.bounds(), s.damageBounds())) {
      damagePlayer();
      return;
    }
  }
}

// ── Boss barrier — player can't run past a living boss ─────────────────────────
function _applyBossBarrier() {
  if (!boss || !boss.alive || !player) return;
  const limit = boss.x + boss.w + 90 - player.w;
  if (player.x > limit) {
    player.x = limit;
    if (player.vx > 0) player.vx = 0;
    if (player.dashing && player.dashDir > 0) player.dashing = false;
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

  updateMovingPlatforms(dt);
  updatePlayer(dt);
  _applyBossBarrier();
  updateEnemies(dt);
  updateShurikens(dt);
  updatePlayerShurikens(dt);
  updateBoss(dt);
  updatePickups(dt);
  updateSpikes();
  updateCamera(dt);
  updateCombo(dt);
  updateGem(dt);
  if (gemWave) {
    gemWave.timer -= dt;
    gemWave.r = gemWave.maxR * (1 - gemWave.timer / 0.55);
    if (gemWave.timer <= 0) gemWave = null;
  }
  if (ammoDisplayTimer > 0) ammoDisplayTimer = Math.max(0, ammoDisplayTimer - dt);

  for (const p of particles)     p.update(dt);
  for (const t of floatingTexts) t.update(dt);
  for (const p of petals)        p.update(dt);

  particles     = particles.filter(p => p.alive);
  if (particles.length > 220) particles = particles.slice(-220);   // hard cap
  floatingTexts = floatingTexts.filter(t => t.alive);
  screenFlash   = Math.max(0, screenFlash - dt * 3.5);
}
