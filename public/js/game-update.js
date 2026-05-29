'use strict';

// ── Platform line-of-sight blocker for projectiles ────────────────────────────
function _blockedByPlatform(x, y) {
  for (const p of platforms) {
    if (x > p.x + 2 && x < p.x + p.w - 2 && y > p.y && y < p.y + p.h) return true;
  }
  return false;
}

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
  if (!survivalMode) {
    const target = player.x - C.W * 0.35;
    const newX   = cam.x + (target - cam.x) * Math.min(dt * 8, 1);
    cam.x = Math.max(cam.x, Math.max(0, Math.min(levelWidth - C.W * 0.4, newX)));
  }
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

// ── Wall contact detector ─────────────────────────────────────────────────────
function _getWallContact(p) {
  if (p.onGround || p.onLadder) return 0;
  for (const pl of platforms) {
    if (p.y >= pl.y + pl.h || p.y + p.h <= pl.y - 8) continue;
    if (Math.abs((p.x + p.w) - pl.x) < 7 && p.vx >= -20) return  1;  // wall on right
    if (Math.abs(p.x - (pl.x + pl.w)) < 7 && p.vx <=  20) return -1;  // wall on left
  }
  return 0;
}

// ── Grapple target finder ─────────────────────────────────────────────────────
function _findHookTarget(p) {
  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  let best = null, bestDist = C.HOOK_RANGE * (playerUpgrades.grapple_long ? 1.6 : 1);
  for (const pl of platforms) {
    const ax  = Math.max(pl.x + 8, Math.min(pl.x + pl.w - 8, pcx));
    const ay  = pl.y;
    if (ay >= pcy - 20) continue;   // must be above player centre
    const d = Math.hypot(ax - pcx, ay - pcy);
    if (d < bestDist) { best = { x: ax, y: ay, len: d }; bestDist = d; }
  }
  return best;
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
        // Start ambush window if an enemy is nearby
        const sx = nearSpot.x + nearSpot.w / 2, sy = nearSpot.y + nearSpot.h / 2;
        const nearEnemy = enemies.some(e =>
          e.alive && !e.dying &&
          Math.abs((e.x + e.w / 2) - sx) < 200 &&
          Math.abs((e.y + e.h / 2) - sy) < 110
        );
        p.ambushWindow = nearEnemy ? C.AMBUSH_WINDOW : 0;
      }
    }
  } else if (left || right || jumpPressed || attackPressed || downJust) {
    if (p.ambushWindow > 0) p.ambushReady = C.AMBUSH_GRACE;
    p.hiding = false; p.hidingAt = null; p.ambushWindow = 0;
  }

  if (p.hiding) {
    if (p.ambushWindow > 0) p.ambushWindow -= dt;
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
      p.dashCooldown = C.DASH_COOLDOWN * (playerUpgrades.dash_quick ? 0.5 : 1);
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
          if (e.hp <= 0 || playerUpgrades.dash_deadly) killEnemy(e);
          else if (e instanceof Grunt) { e.aiState = 'alert'; e.detectTimer = C.DETECTION_TIME; }
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

  // ── Grappling hook (while hooked) ──────────────────────────────────────────
  if (p.hooked) {
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.invincible > 0)     p.invincible     -= dt;
    if (throwCooldown > 0)    throwCooldown    -= dt;

    // Space releases the grapple (carries swing momentum, restores one jump)
    if (keyJustPressed('Space')) {
      p.hooked = null;
      p.jumpsLeft = Math.max(p.jumpsLeft, 1);
      p.facing = p.vx > 5 ? 1 : p.vx < -5 ? -1 : p.facing;
      p.state = 'jump'; p.prevState = 'jump';
      p.animTimer += dt; if (p.animTimer > 0.10) { p.animFrame++; p.animTimer = 0; }
      return;
    }

    const anchor = p.hooked;

    // Up/W climbs the rope (shortens length toward anchor)
    const upHeld = keys['ArrowUp'] || keys['KeyW'];
    if (upHeld && anchor.len > 32) anchor.len = Math.max(32, anchor.len - C.HOOK_CLIMB_SPEED * dt);

    // Apply gravity; left/right boosts the swing
    p.vy += C.GRAVITY * dt;
    if (left)  p.vx -= 280 * dt;
    if (right) p.vx += 280 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Constraint: keep player at rope length from anchor
    const dx   = (p.x + p.w / 2) - anchor.x;
    const dy   = (p.y + p.h / 2) - anchor.y;
    const dist = Math.hypot(dx, dy);
    if (dist > anchor.len && dist > 1) {
      const nx = dx / dist, ny = dy / dist;
      const dot = p.vx * nx + p.vy * ny;
      if (dot > 0) { p.vx -= dot * nx; p.vy -= dot * ny; }
      p.x = anchor.x + nx * anchor.len - p.w / 2;
      p.y = anchor.y + ny * anchor.len - p.h / 2;
    }

    // Left camera boundary
    if (p.x < cam.x) { p.x = cam.x; if (p.vx < 0) p.vx = 0; }

    // Auto-release when landing on a platform or the ground
    platformCollision(p);
    if (p.onGround) { p.hooked = null; p.jumpsLeft = 2; }
    else if (p.y + p.h >= C.H + 100) { playerHp = 0; gameState = STATE.GAMEOVER; Audio.stop(); }

    p.facing = p.vx > 5 ? 1 : p.vx < -5 ? -1 : p.facing;
    p.state  = 'jump'; p.prevState = 'jump';
    p.animTimer += dt; if (p.animTimer > 0.10) { p.animFrame++; p.animTimer = 0; }
    return;
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
  if (p.vx !== 0) {
    p.facing = p.vx > 0 ? 1 : -1;
  } else if (!_isTouchDevice && !p.hiding) {
    // Mouse aim: face cursor when not moving
    p.facing = (mouse.x + cam.x) > (p.x + p.w / 2) ? 1 : -1;
  }

  if (jumpPressed && !p.hooked) {
    const allowJump = !p.onLadder || jumpPressed;
    if (allowJump) {
      // Wall jump takes priority when in the air near a platform edge
      const wallDir = !p.onGround && !p.onLadder ? _getWallContact(p) : 0;
      if (wallDir !== 0) {
        p.vy = C.JUMP_V * (playerUpgrades.wall_boost ? 1.25 : 1);
        p.vx = -wallDir * C.WALL_JUMP_VX * (playerUpgrades.wall_boost ? 1.3 : 1);
        p.facing = -wallDir;
        emitDust(particles, p.x + (wallDir > 0 ? p.w : 0), p.y + p.h * 0.5);
        Audio.jump();
      } else if (p.jumpsLeft > 0) {
        const wasDouble = p.jumpsLeft === 1;
        p.vy = C.JUMP_V; p.jumpsLeft--;
        if (p.onLadder) { p.onLadder = false; p.ladderCooldown = 0.4; _activeLadder = null; }
        if (wasDouble) { emitDoubleJump(particles, p.x + p.w / 2, p.y + p.h); Audio.djump(); }
        else Audio.jump();
      }
    }
  }

  // ── Grapple launch: Up/W while airborne with no jumps remaining ───────────────
  const upJust = keyJustPressed('ArrowUp') || keyJustPressed('KeyW');
  if (upJust && !p.onGround && !p.hooked && !p.onLadder && p.jumpsLeft === 0 && !p.dashing) {
    const hookTarget = _findHookTarget(p);
    if (hookTarget) {
      p.hooked = hookTarget;
      emitDust(particles, p.x + p.w / 2, p.y);
      Audio.slash();
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
  if (p.ambushReady > 0)      p.ambushReady    -= dt;
  if (throwCooldown > 0)      throwCooldown    -= dt;

  // Ladder climbing overrides normal gravity
  p.onGround = false;
  if (p.onLadder) {
    const climbUp   = keys['ArrowUp']   || keys['KeyW'];
    const climbDown = keys['ArrowDown'] || keys['KeyS'];
    // Step off sideways: pressing left/right detaches the player if the path is clear
    const sideDir = right ? 1 : left ? -1 : 0;
    if (sideDir !== 0) {
      // Check for a platform wall blocking that direction
      const testX = sideDir > 0 ? p.x + p.w + 2 : p.x - 10;
      const blocked = platforms.some(pl =>
        testX < pl.x + pl.w && testX + 8 > pl.x &&
        p.y + p.h - 6 > pl.y && p.y + 8 < pl.y + pl.h
      );
      if (!blocked) {
        p.onLadder = false; _activeLadder = null; p.ladderCooldown = 0.25;
      }
    }
    if (p.onLadder) {
      p.vy = climbUp ? -C.LADDER_SPEED : climbDown ? C.LADDER_SPEED : 0;
      p.x  = _activeLadder.x + (_activeLadder.w - p.w) / 2;
      p.jumpsLeft = Math.max(p.jumpsLeft, 1);
    }
  }
  if (!p.onLadder) {
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
      const GP_RANGE = 80 * (playerUpgrades.quake ? 2 : 1);
      groundPoundWave = { x: p.x + p.w / 2, y: p.y + p.h, r: 8, maxR: GP_RANGE + 30, timer: 0.38 };
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
  combo = 1; comboTimer = 0; streakKills = 0;
  player.invincible = C.INVINCIBLE_TIME;
  screenFlash = 1.8;
  triggerShake(14, 0.45);
  emitHit(particles, player.x + player.w / 2, player.y + player.h / 2);
  floatingTexts.push(new FloatingText(player.x + player.w/2, player.y - 18, `-${C.CONTACT_DAMAGE}`, '#ff2020', 1.6));
  Audio.hit();
  if (playerHp <= 0) {
    if (playerUpgrades.smoke_death) {
      smokeBombs.push(new SmokeBomb(player.x + player.w/2, player.y + player.h/2));
    }
    if (survivalMode) {
      gameState = STATE.SURVIVAL_OVER; Audio.stop(); return;
    }
    const activeCP = checkpoints.findLast(c => c.activated);
    if (activeCP) {
      playerHp       = 40;
      player.x       = activeCP.x - player.w / 2;
      player.y       = C.GROUND_Y - player.h;
      player.vx      = 0; player.vy = 0;
      player.hooked  = null;
      player.onGround = false;
      player.jumpsLeft = 2;
      player.invincible = 2.5;
      cam.x = Math.max(0, activeCP.x - C.W * 0.40);
      screenFlash = 0.9;
      triggerShake(12, 0.5);
      floatingTexts.push(new FloatingText(player.x + player.w/2, player.y - 50, 'ÅTERUPPSTOD!', '#88ff88', 2.0));
      Audio.levelUp();
    } else {
      gameState = STATE.GAMEOVER; Audio.stop();
    }
  }
}

function throwWeapon() {
  const cx = player.x + player.w / 2 + player.facing * 18;
  const cy = player.y + player.h * 0.3;
  // On desktop, aim toward mouse cursor in world space
  let aimAngle = null;
  if (!_isTouchDevice) {
    const mx = mouse.x + cam.x, my = mouse.y;
    aimAngle = Math.atan2(my - cy, mx - cx);
    player.facing = mx > (player.x + player.w / 2) ? 1 : -1;
  }
  if (playerWeapon === 'smoke') {
    smokeBombs.push(new SmokeBomb(player.x + player.facing * 90, player.y + player.h * 0.5));
    throwAmmo--;
    if (throwAmmo <= 0) { throwAmmo = 0; playerWeapon = 'sword'; }
    ammoDisplayTimer = 1.8;
    Audio.slash();
    return;
  }
  if (playerWeapon === 'triple') {
    [-0.18, 0, 0.18].forEach(a => {
      const wAngle = aimAngle !== null ? aimAngle + a : null;
      const ps = new PlayerShuriken(cx, cy, player.facing, 'shuriken', a, wAngle);
      if (playerUpgrades.pierce_all) ps.piercing = true;
      playerShurikens.push(ps);
    });
  } else {
    const ps = new PlayerShuriken(cx, cy, player.facing,
      playerWeapon === 'knife' ? 'knife' : 'shuriken', 0, aimAngle);
    if (playerUpgrades.pierce_all) ps.piercing = true;
    playerShurikens.push(ps);
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
    if (!nearViewport && (!(e instanceof Grunt) || e.aiState === 'patrol')) continue;
    if (e instanceof Grunt) {
      e.updateStealth(dt, player);
      e.update(dt, player);
    } else {
      e.update(dt, player, shurikens);
    }

    // Capture overlap BEFORE push-out — push moves player to exact edge so
    // rectsOverlap returns false afterwards, which would suppress contact damage.
    // Dashing player powers through enemies — skip push-out entirely.
    const wasOverlapping = !player.hiding && !player.dashing && rectsOverlap(player.bounds(), e.bounds());
    let stomped = false;
    if (wasOverlapping) {
      // ── Head stomp: player falls onto enemy from above ──────────────────
      const fallingFast = player.vy > 90;
      const feetNearTop = (player.y + player.h) <= (e.y + e.h * 0.4);
      if (fallingFast && feetNearTop && player.invincible <= 0) {
        stomped = true;
        player.vy = C.JUMP_V * 0.60;                // bounce upward
        player.jumpsLeft = Math.max(player.jumpsLeft, 1);
        e.hp--;
        e.hitFlash = 0.18;
        if (e instanceof Grunt && !e.slipping) {
          e.slipping = true; e.slipTimer = 1.6; e.slipRot = 0;
          e.vx = (Math.random() > 0.5 ? 1 : -1) * 100; e.vy = 0;
        }
        emitLandingImpact(particles, player.x + player.w / 2, player.y + player.h, 460);
        triggerShake(5, 0.16);
        screenFlash = Math.max(screenFlash, 0.22);
        floatingTexts.push(new FloatingText(e.x + e.w / 2, e.y - 22, 'TRAMPA!', '#ffe040', 1.55));
        Audio.hit();
        if (e.hp <= 0) killEnemy(e);
      } else {
        // Normal horizontal push-out
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
    }
    if (player.attackActive) {
      const hb = player.attackHitbox();
      if (rectsOverlap(hb, e.bounds())) {
        if (player.ambushReady > 0) {
          // Timed ambush burst — guaranteed stealth kill
          player.ambushReady = 0;
          killEnemy(e, true);
          floatingTexts.push(new FloatingText(e.x + e.w / 2, e.y - 40, 'MÖRDARHOPP!', '#ffe040', 1.9));
        } else if (e instanceof Grunt && e.aiState !== 'alert' && e.isBehind(player)) {
          killEnemy(e, true);
        } else if (e.type === 'shield-grunt' && e.shieldBlocks(player.x + player.w / 2)) {
          e.shieldHp--;
          emitHit(particles, hb.x + hb.w / 2, hb.y + hb.h / 2);
          Audio.shieldBlock();
          e.aiState = 'alert'; e.detectTimer = C.DETECTION_TIME;
          if (e.shieldHp <= 0) {
            e.shieldBroken = true;
            floatingTexts.push(new FloatingText(e.x + e.w/2, e.y - 34, 'SKÖLD KROSSAD!', '#ff8c35', 1.5));
            triggerShake(6, 0.20);
            // Shield just broke — count this hit as landing
            e.hp--;
            e.hitFlash = 0.12;
            if (e.hp <= 0) killEnemy(e);
          } else {
            // Shield held — knock player back
            player.vx       = -player.facing * 230;
            player.vy       = -110;
            player.attacking = false;
            triggerShake(5, 0.18);
            floatingTexts.push(new FloatingText(e.x + e.w/2, e.y - 32, 'BLOCKAD!', '#88aaff', 1.2));
          }
        } else {
          e.hp--;
          e.hitFlash = 0.12;
          emitHit(particles, e.x + e.w/2, e.y + e.h/2);
          if (e.hp <= 0) killEnemy(e);
          else if (e instanceof Grunt) { e.aiState = 'alert'; e.detectTimer = C.DETECTION_TIME; }
        }
      }
    }
    // Alert grunts and archers deal contact damage (stomps are immune to retaliation)
    const dealsDmg = !stomped && (e.type === 'archer' || (e instanceof Grunt && e.aiState === 'alert'));
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
  kills++; levelKills++;
  if (survivalMode) { survivalKills++; survivalScore += 10 * Math.max(1, survivalWave); }
  // Kill streak rewards
  streakKills++;
  if (streakKills === C.STREAK_SMOKE) {
    pickups.push(new WeaponPickup(e.x, e.y - 10, 'smoke'));
    floatingTexts.push(new FloatingText(e.x + e.w/2, e.y - 50, 'ELDSVIT! RÖKBOMB!', '#88cc88', 1.8));
  } else if (streakKills === C.STREAK_TRIPLE) {
    pickups.push(new WeaponPickup(e.x, e.y - 10, 'triple'));
    floatingTexts.push(new FloatingText(e.x + e.w/2, e.y - 50, 'ELDSVIT! TRIPPELSTJÄRNA!', '#ff8c35', 1.9));
    triggerShake(6, 0.22);
  }
  if (playerUpgrades.stealth_jump && stealth) {
    player.jumpsLeft = Math.max(player.jumpsLeft, 1);
  }
  // Drop 1-3 coins at kill position
  const dropCount = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < dropCount; i++) {
    const c = new Coin(e.x + e.w / 2 - 10 + i * 10, e.y);
    c.vy = -(80 + Math.random() * 120);
    c.vx = (Math.random() - 0.5) * 120;
    coins.push(c);
  }
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
      if (!other.alive || other === e || !(other instanceof Grunt)) continue;
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

  // Edwin: summon grunts on entering phase 2
  if (boss.type === 'edwin' && boss.phase2 && !boss.summonedGrunts) {
    boss.summonedGrunts = true;
    const p = boss.platform;
    [p.x + 24, p.x + p.w - 54].forEach(ex => {
      const g = new Grunt(ex, p, C.ENEMY_SPEED_MUL * 1.3);
      g.aiState = 'alert'; g.detectTimer = C.DETECTION_TIME;
      enemies.push(g);
    });
    floatingTexts.push(new FloatingText(boss.x + boss.w/2, boss.y - 55, 'SKICKAR VAKTER!', '#ff4040', 1.8));
    levelTotalEnemies += 2;
  }

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

  // Edwin: special victory fanfare
  if (boss.type === 'edwin') {
    for (let i = 0; i < 10; i++)
      emitEnemyDeath(particles, boss.x + boss.w/2 + (i-4)*25, boss.y + boss.h/2 - i*5);
    floatingTexts.push(new FloatingText(boss.x + boss.w/2, boss.y - 90, 'GRATTIS EDWIN! \u{1F38A}', '#ffd700', 2.8));
    floatingTexts.push(new FloatingText(boss.x + boss.w/2, boss.y - 125, 'DU ÄR EN RIKTIG NINJA!', '#ffffff', 1.8));
  }

  // Survival boss kill adds score
  if (survivalMode) { survivalScore += C.BOSS_KILL_SCORE; }

  // Stealth run bonus
  if (levelAlertCount === 0) {
    score += C.STEALTH_RUN_BONUS;
    floatingTexts.push(new FloatingText(boss.x + boss.w/2, boss.y - 80, 'STEALTH RUN!', '#a0f0ff', 2.2));
    floatingTexts.push(new FloatingText(boss.x + boss.w/2, boss.y - 108, `+${C.STEALTH_RUN_BONUS} BONUS`, C.COL_GOLD, 1.6));
  }

  // Compute level rank
  const killFrac = levelTotalEnemies > 0 ? levelKills / levelTotalEnemies : 1;
  if      (killFrac >= 0.90 && playerHp >= 70 && levelTimer < 90)  lastLevelRank = 'S';
  else if (killFrac >= 0.70 && playerHp >= 40 && levelTimer < 200) lastLevelRank = 'A';
  else if (killFrac >= 0.45 && playerHp >= 15)                     lastLevelRank = 'B';
  else if (playerHp >= 5)                                           lastLevelRank = 'C';
  else                                                              lastLevelRank = 'D';

  levelCompleteTimer = 3.5;
  gameState = STATE.LEVEL_COMPLETE;
}

// ── Enemy shurikens ────────────────────────────────────────────────────────────
function updateShurikens(dt) {
  for (const s of shurikens) {
    s.update(dt, cam.x);
    if (!s.alive) continue;
    if (_blockedByPlatform(s.x, s.y)) {
      s.alive = false;
      emitHit(particles, s.x, s.y);
      continue;
    }
    if (!player.hiding && player.invincible <= 0 && rectsOverlap(player.bounds(), s.bounds())) {
      s.alive = false;
      emitBloodSplat(particles, player.x + player.w / 2, player.y + player.h * 0.4, s.vx > 0 ? 1 : -1);
      damagePlayer();
    }
  }
  shurikens = shurikens.filter(s => s.alive);
}

// ── Player projectiles ─────────────────────────────────────────────────────────
function updatePlayerShurikens(dt) {
  for (const s of playerShurikens) {
    s.update(dt);
    if (!s.alive) continue;

    if (_blockedByPlatform(s.x, s.y)) {
      s.alive = false;
      emitHit(particles, s.x, s.y);
      continue;
    }

    if (boss && boss.alive && !s.hitSet.has(boss) && rectsOverlap(s.bounds(), boss.bounds())) {
      if (boss.shieldActive) {
        boss.shieldHp--;
        s.alive = false;
        emitHit(particles, s.x, s.y);
        Audio.shieldBlock();
        triggerShake(3, 0.12);
        if (boss.shieldHp <= 0) {
          boss.shieldBroken = true;
          boss.shieldActive = false;
          floatingTexts.push(new FloatingText(boss.x + boss.w/2, boss.y - 46, 'SKÖLD KROSSAD!', '#ff8c35', 1.6));
          triggerShake(8, 0.30);
        }
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
        emitBloodSplat(particles, e.x + e.w / 2, e.y + e.h * 0.4, s.vx > 0 ? 1 : -1);
        if (e.hp <= 0) {
          killEnemy(e);
        } else if (e instanceof Grunt) {
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
    if (Math.abs(c.vx) > 1 || c.y < C.GROUND_Y - c.h - 2) {
      c.vy += C.GRAVITY * 0.6 * dt;
      c.x  += c.vx * dt;
      c.y  += c.vy * dt;
      c.vx *= Math.max(0, 1 - 2 * dt);
      if (c.y + c.h >= C.GROUND_Y) { c.y = C.GROUND_Y - c.h; c.vy = 0; c.vx *= 0.4; }
    }
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
      const coinVal = C.COIN_VALUE * (playerUpgrades.coin_double ? 2 : 1);
      score += coinVal;
      if (survivalMode) survivalScore += coinVal;
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
      } else if (p.type === 'smoke') {
        playerWeapon = 'smoke';
        throwAmmo    = C.SMOKE_AMMO + playerBonusAmmo;
        floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 10, 'RÖKBOMB!', '#88cc88', 1.2));
        floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 30, `TRYCK X  ×${C.SMOKE_AMMO}`, 'rgba(255,255,255,0.75)', 0.78));
        Audio.djump();
      } else {
        playerWeapon = p.type;
        throwAmmo = C.THROW_AMMO + playerBonusAmmo;
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

// ── Smoke bombs ────────────────────────────────────────────────────────────────
function updateSmokeBombs(dt) {
  if (!smokeBombs.length) return;
  for (const s of smokeBombs) s.update(dt);
  smokeBombs = smokeBombs.filter(s => s.alive);
}

// ── Checkpoints ────────────────────────────────────────────────────────────────
function updateCheckpoints() {
  if (!player || !player.onGround) return;
  const pcx = player.x + player.w / 2;
  for (const cp of checkpoints) {
    if (!cp.activated && Math.abs(pcx - cp.x) < 32) {
      cp.activated = true;
      for (let i = 0; i < 12; i++) {
        const a = Math.PI + (Math.random() - 0.5) * 2;
        particles.push(new Particle(cp.x, C.GROUND_Y - 60,
          Math.cos(a)*50, Math.sin(a)*60 - 40, '#88ff88', 3 + Math.random()*3, 0.6, -80));
      }
      floatingTexts.push(new FloatingText(cp.x, C.GROUND_Y - 90, 'CHECKPOINT!', '#88ff88', 1.5));
      Audio.djump();
    }
  }
}

// ── Survival wave system ──────────────────────────────────────────────────────
function _waveSpec(wave) {
  if (wave === 1) return { grunts: 5,  shields: 0, archers: 0, boss: false };
  if (wave === 2) return { grunts: 7,  shields: 0, archers: 2, boss: false };
  if (wave === 3) return { grunts: 8,  shields: 1, archers: 3, boss: false };
  if (wave === 4) return { grunts: 9,  shields: 2, archers: 4, boss: false };
  if (wave === 5) return { grunts: 10, shields: 2, archers: 4, boss: true  };
  const b = Math.min(wave - 4, 8);
  return { grunts: 10 + b, shields: 2 + Math.floor(b/2), archers: 4 + Math.floor(b/2), boss: wave % 3 === 0 };
}

function spawnWave(wave) {
  survivalWave       = wave;
  enemies            = [];
  boss               = null;
  survivalSpawnQueue = [];
  survivalSpawnTimer = 0;

  const spec     = _waveSpec(wave);
  const spdMul   = C.ENEMY_SPEED_MUL * (1 + (wave - 1) * 0.1);
  const shootInt = C.archerInterval * C.SHOOT_MUL * Math.max(0.4, 1 - (wave-1)*0.08);
  const plats    = platforms;

  // Build queue — blueprints only, enemies trickle in during updateSurvival
  for (let i = 0; i < spec.grunts; i++) {
    const gx = 1100 + i * 6 + Math.random() * 50;
    survivalSpawnQueue.push({ type: 'grunt', gx, spdMul });
  }
  for (let i = 0; i < spec.shields; i++) {
    const pl = plats[(i * 2 + 1) % plats.length];
    survivalSpawnQueue.push({ type: 'shield', pl, spdMul });
  }
  for (let i = 0; i < spec.archers; i++) {
    const pl = plats[i % plats.length];
    survivalSpawnQueue.push({ type: 'archer', pl, spdMul, shootInt });
  }
  // Shuffle so enemy types arrive in varied order, boss always last
  survivalSpawnQueue.sort(() => Math.random() - 0.5);
  if (spec.boss) survivalSpawnQueue.push({ type: 'boss', wave });

  wavePhase = 'fighting';
  floatingTexts.push(new FloatingText(C.W/2, C.GROUND_Y - 220,
    `VÅNING ${wave}!`, '#ffe040', 2.2));

  // Random wave event (from wave 2 onward, 65% chance)
  waveEvent = '';
  if (wave >= 2 && Math.random() < 0.65) {
    const EVT = ['blackout', 'kaos', 'goldrain', 'ghost'];
    const EVT_NAMES = { blackout: 'MÖRKRET FALLER!', kaos: 'KAOS!', goldrain: 'GULDREGN!', ghost: 'SPÖKRUNDA!' };
    const EVT_COLS  = { blackout: '#88aaff', kaos: '#ff4444', goldrain: '#ffd700', ghost: '#aaffaa' };
    waveEvent = EVT[Math.floor(Math.random() * EVT.length)];
    waveEventTimer = 18;
    floatingTexts.push(new FloatingText(C.W/2, C.GROUND_Y - 260,
      EVT_NAMES[waveEvent], EVT_COLS[waveEvent], 1.8));
  }
}

function _doSpawn(bp) {
  const plats = platforms;
  if (bp.type === 'grunt') {
    const gPlat = { x: bp.gx - 80, y: C.GROUND_Y, w: 160, h: 14 };
    const g = new Grunt(bp.gx, gPlat, bp.spdMul);
    g.aiState = 'alert'; g.detectTimer = C.DETECTION_TIME;
    enemies.push(g);
  } else if (bp.type === 'shield') {
    const sg = new ShieldGrunt(bp.pl.x + bp.pl.w * 0.8, bp.pl, bp.spdMul);
    sg.aiState = 'alert'; sg.detectTimer = C.DETECTION_TIME;
    enemies.push(sg);
  } else if (bp.type === 'archer') {
    enemies.push(new Archer(bp.pl.x + bp.pl.w * 0.6, bp.pl, bp.spdMul, bp.shootInt));
  } else if (bp.type === 'boss') {
    const bp2 = plats[4];
    boss = new Boss(bp2.x + bp2.w/2 - 18, bp2.y - 48, bp2, 6 + bp.wave, 'samurai');
    Audio.bossFight();
  }
}

const _SPAWN_INTERVAL   = 1.8;   // seconds between each new enemy
const _MAX_CONCURRENT   = 5;     // max alive enemies on screen at once

function updateSurvival(dt) {
  // Wave event tick
  if (waveEvent && waveEventTimer > 0) {
    waveEventTimer -= dt;
    if (waveEvent === 'goldrain' && Math.random() < 1.8 * dt) {
      const c = new Coin(Math.random() * C.W, -10);
      c.vy = 90 + Math.random() * 80;
      c.vx = (Math.random() - 0.5) * 40;
      coins.push(c);
    }
    if (waveEventTimer <= 0) waveEvent = '';
  }

  // Drip-feed enemies from queue
  if (survivalSpawnQueue.length > 0) {
    survivalSpawnTimer -= dt;
    const aliveCount = enemies.filter(e => e.alive).length;
    if (survivalSpawnTimer <= 0 && aliveCount < _MAX_CONCURRENT) {
      _doSpawn(survivalSpawnQueue.shift());
      survivalSpawnTimer = _SPAWN_INTERVAL;
    }
  }

  // Wave complete when queue is empty and no enemies alive
  const anyAlive = enemies.some(e => e.alive) || (boss && boss.alive);
  if (!anyAlive && survivalSpawnQueue.length === 0) {
    waveCountdown -= dt;
    if (waveCountdown <= 0) {
      const bonus = survivalWave * 100;
      if (survivalWave > 0) {
        survivalScore += bonus;
        floatingTexts.push(new FloatingText(C.W/2, C.GROUND_Y - 260,
          `VÅNING KLAR! +${bonus}`, C.COL_GOLD, 1.6));
      }
      spawnWave(survivalWave + 1);
      waveCountdown = 4;
    }
  }
}

// ── Player 2 (co-op survival) ─────────────────────────────────────────────────
function updatePlayer2(dt) {
  if (!player2 || !player2.alive) return;
  const p = player2;
  // P2 keys: Arrow keys + NumpadEnter(jump) + Numpad0(attack) + Delete(throw)
  const left2  = keys['ArrowLeft'];
  const right2 = keys['ArrowRight'];
  const jump2  = keyJustPressed('ArrowUp') || keyJustPressed('Numpad5') || keyJustPressed('NumpadEnter');
  const atk2   = keyJustPressed('Numpad0') || keyJustPressed('ControlRight');
  const throw2 = keyJustPressed('Delete')  || keyJustPressed('NumpadDecimal');

  const spd2 = C.PLAYER_SPEED;
  p.vx = right2 ? spd2 : left2 ? -spd2 : 0;
  if (p.vx !== 0) p.facing = p.vx > 0 ? 1 : -1;

  // Jump
  if (jump2 && p.jumpsLeft > 0) {
    const wasDouble = p.jumpsLeft === 1;
    p.vy = C.JUMP_V; p.jumpsLeft--;
    if (wasDouble) { emitDoubleJump(particles, p.x + p.w/2, p.y + p.h); Audio.djump(); }
    else Audio.jump();
  }
  // Melee attack
  if (atk2 && p.attackCooldown <= 0) {
    p.attacking = true; p.attackTimer = C.ATTACK_DURATION; p.attackCooldown = 0.35;
    emitSwordSlash(particles, p.x + (p.facing > 0 ? p.w + 10 : -10), p.y + p.h * 0.35, p.facing);
    Audio.slash();
  }
  // Throw (shuriken only)
  if (throw2 && p2ThrowAmmo > 0 && p2ThrowCooldown <= 0) {
    playerShurikens.push(new PlayerShuriken(p.x + p.w/2 + p.facing*18, p.y + p.h*0.3, p.facing, 'shuriken'));
    p2ThrowAmmo--; p2ThrowCooldown = C.THROW_COOLDOWN;
    Audio.slash();
  }

  if (p.attackTimer > 0)    { p.attackTimer -= dt; if (p.attackTimer <= 0) p.attacking = false; }
  if (p.attackCooldown > 0)   p.attackCooldown -= dt;
  if (p.invincible > 0)       p.invincible     -= dt;
  if (p2ThrowCooldown > 0)    p2ThrowCooldown  -= dt;

  // Physics
  p.onGround = false;
  p.vy += C.GRAVITY * dt;
  p.x  += p.vx * dt;
  p.y  += p.vy * dt;
  if (p.x < 0) p.x = 0;
  if (p.x + p.w > C.W) p.x = C.W - p.w;
  platformCollision(p);
  if (p.y > C.H + 100) { p2Hp = 0; }

  // State
  const prevSt = p.prevState;
  p.state = p.attacking ? 'attack' : p.onGround ? (Math.abs(p.vx) > 5 ? 'run' : 'idle') : 'jump';
  if (p.state !== prevSt) { p.animFrame = 0; p.animTimer = 0; p.prevState = p.state; }
  p.animTimer += dt;
  if (p.animTimer > 0.10) { p.animFrame++; p.animTimer = 0; }

  // Enemy collision
  for (const e of enemies) {
    if (!e.alive || e.dying) continue;
    if (p.invincible <= 0 && rectsOverlap(p.bounds(), e.bounds())) {
      p2Hp = Math.max(0, p2Hp - C.CONTACT_DAMAGE);
      p.invincible = C.INVINCIBLE_TIME;
      emitHit(particles, p.x + p.w/2, p.y + p.h/2);
      Audio.hit();
    }
    if (p.attackActive && rectsOverlap(p.attackHitbox(), e.bounds())) {
      e.hp--;
      e.hitFlash = 0.12;
      if (e.hp <= 0) killEnemy(e);
      else if (e instanceof Grunt) { e.aiState = 'alert'; e.detectTimer = C.DETECTION_TIME; }
    }
  }
  if (p2Hp <= 0 && p.alive) {
    p.alive = false;
    floatingTexts.push(new FloatingText(p.x + p.w/2, p.y - 40, 'P2 NERE!', '#ff4444', 2.0));
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
  if (gameState === STATE.UPGRADE_PICK) {
    for (const p of particles)     p.update(dt);
    for (const t of floatingTexts) t.update(dt);
    particles     = particles.filter(p => p.alive);
    floatingTexts = floatingTexts.filter(t => t.alive);
    return;
  }
  const isSurvival = gameState === STATE.SURVIVAL;
  if (gameState !== STATE.PLAYING && !isSurvival) return;

  if (!survivalMode) levelTimer += dt;
  updateMovingPlatforms(dt);
  updatePlayer(dt);
  _applyBossBarrier();
  updateEnemies(dt);
  updateShurikens(dt);
  updatePlayerShurikens(dt);
  updateBoss(dt);
  updatePickups(dt);
  updateSpikes();
  updateSmokeBombs(dt);
  if (!survivalMode) updateCheckpoints();
  else { updateSurvival(dt); if (coopMode) updatePlayer2(dt); }
  updateCamera(dt);
  updateCombo(dt);
  updateGem(dt);
  if (gemWave) {
    gemWave.timer -= dt;
    gemWave.r = gemWave.maxR * (1 - gemWave.timer / 0.55);
    if (gemWave.timer <= 0) gemWave = null;
  }
  if (groundPoundWave) {
    groundPoundWave.timer -= dt;
    groundPoundWave.r = groundPoundWave.maxR * (1 - groundPoundWave.timer / 0.38);
    if (groundPoundWave.timer <= 0) groundPoundWave = null;
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
