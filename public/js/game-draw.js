'use strict';

// ── Hiding spot drawing ───────────────────────────────────────────────────────
function drawBarrel(ctx, x, y, w, h) {
  ctx.fillStyle = '#5a2d0c';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#7a4020';
  ctx.fillRect(x, y, w, 6);
  ctx.fillStyle = '#7a4020';
  ctx.fillRect(x, y + h - 5, w, 5);
  ctx.fillStyle = '#2a1208';
  ctx.fillRect(x, y + 9, w, 3);
  ctx.fillRect(x, y + h - 12, w, 3);
  ctx.strokeStyle = '#1a0804'; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.lineWidth = 1;
}

function drawShadowPool(ctx, x, y, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.76;
  ctx.fillStyle = '#0a0014';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHidingSpot(ctx, spot) {
  if (spot.type === 'barrel') drawBarrel(ctx, spot.x, spot.y, spot.w, spot.h);
  else drawShadowPool(ctx, spot.x, spot.y, spot.w, spot.h);
}

// ── Enemy detection indicator (no visible cone box) ──────────────────────────
function drawDetectionCone(ctx, e) {
  if (e.aiState === 'patrol') return;
  const cx  = e.x + e.w / 2;
  const pct = e.aiState === 'suspect' ? e.detectTimer / C.DETECTION_TIME : 1;

  const label = e.aiState === 'alert' ? '!' : '?';
  const col   = e.aiState === 'alert' ? '#ff4040' : '#ffdd00';
  ctx.save();
  ctx.font = 'bold 20px system-ui';
  ctx.textAlign = 'center';
  ctx.fillStyle = col;
  ctx.fillText(label, cx, e.y - 16);

  if (e.aiState === 'suspect') {
    const bw = 28, bh = 4, bx = cx - 14, by = e.y - 9;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#ffdd00';
    ctx.fillRect(bx, by, bw * pct, bh);
  }
  ctx.restore();
}

// ── Enemy HP bar ──────────────────────────────────────────────────────────────
function drawEnemyHpBar(ctx, e) {
  const bw = e.w + 8, bh = 4, bx = e.x - 4, by = e.y - 10;
  ctx.fillStyle = 'rgba(0,0,0,0.60)';
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = '#2a0000';
  ctx.fillRect(bx, by, bw, bh);
  const frac = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = frac > 0.55 ? '#22cc44' : frac > 0.25 ? '#ddaa00' : '#dd2222';
  ctx.fillRect(bx, by, bw * frac, bh);
}

// ── Platform drawing ──────────────────────────────────────────────────────────
function drawPlatform(ctx, p) {
  const TILE = 16;
  if (typeof Sprites !== 'undefined' && Sprites.has('terrain')) {
    const cols = Math.max(1, Math.ceil(p.w / p.h));
    const tw   = p.w / cols;
    for (let i = 0; i < cols; i++) {
      const tx = i === 0 ? 0 : (i === cols - 1 ? 2 : 1);
      Sprites.drawTile(ctx, tx, 0, TILE, p.x + i * tw, p.y, tw + 1, p.h);
    }
    return;
  }
  ctx.fillStyle = '#3a5a1a';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = '#8aba3a';
  ctx.fillRect(p.x, p.y, p.w, 3);
  ctx.fillStyle = '#1e3010';
  ctx.fillRect(p.x, p.y + p.h - 3, p.w, 3);
}

// ── FPS / frame-time counters ─────────────────────────────────────────────────
let _fpsCount = 0, _fpsAccum = 0, _fpsDisplay = 0;
// Timing set by the game loop (game-main.js)
let _diagUpdateMs = 0, _diagDrawMs = 0;

// ── Main draw ──────────────────────────────────────────────────────────────────
function draw(dt) {
  if (dt > 0) {
    _fpsCount++;
    _fpsAccum += dt;
    if (_fpsAccum >= 0.5) {
      _fpsDisplay = Math.round(_fpsCount / _fpsAccum);
      _fpsCount = 0; _fpsAccum = 0;
    }
  }

  ctx.clearRect(0, 0, C.W, C.H);

  if (gameState === STATE.MENU) {
    UI.drawMenu(ctx, dt, leaderboard);
    return;
  }

  Background.drawBackground(ctx, cam.x);

  // Ground drawn in screen-space (before camera translate) so it always covers full width
  if (typeof Sprites === 'undefined' || !Sprites.has('bg-level' + (bgTheme + 1))) {
    Background.drawGround(ctx, cam.x);
  }

  ctx.save();
  ctx.translate(-cam.x + cam.shake, cam.shake * 0.4);

  for (const p of platforms) {
    if (p.x + p.w < cam.x - 20 || p.x > cam.x + C.W + 20) continue;
    drawPlatform(ctx, p);
  }

  // Hiding spots — draw all except the active one (drawn on top of player later)
  for (const s of hidingSpots) {
    if (s === player?.hidingAt) continue;
    if (s.x + s.w < cam.x - 20 || s.x > cam.x + C.W + 20) continue;
    drawHidingSpot(ctx, s);
  }

  for (const p of particles) {
    if (p.x < cam.x - 60 || p.x > cam.x + C.W + 60) continue;
    p.draw(ctx);
  }

  for (const p of pickups) {
    if (!p.alive || p.x + 30 < cam.x - 30 || p.x > cam.x + C.W + 30) continue;
    p.draw(ctx);
  }

  for (const e of enemies) {
    if (!e.alive || e.x + e.w < cam.x - 20 || e.x > cam.x + C.W + 20) continue;
    if (e.type === 'grunt') drawDetectionCone(ctx, e);
    e.type === 'archer' ? drawArcher(ctx, e) : drawGrunt(ctx, e);
    drawEnemyHpBar(ctx, e);
  }

  for (const s of shurikens) {
    if (s.x < cam.x - 40 || s.x > cam.x + C.W + 40) continue;
    drawShuriken(ctx, s.x, s.y, s.rot);
  }
  for (const s of playerShurikens) {
    if (s.x < cam.x - 40 || s.x > cam.x + C.W + 40) continue;
    s.draw(ctx);
  }

  if (boss && boss.alive) drawBoss(ctx, boss);
  if (player) {
    if (gemPower && !player.hiding) {
      const pulse = 0.55 + Math.sin(Date.now() * 0.006) * 0.45;
      ctx.save();
      ctx.globalAlpha = pulse * 0.55;
      ctx.fillStyle = '#a0f0ff';
      ctx.beginPath();
      ctx.ellipse(player.x + player.w/2, player.y + player.h/2,
                  player.w * 1.5, player.h * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    if (player.hiding) {
      ctx.save(); ctx.globalAlpha = 0.18;
      drawNinjaPlayer(ctx, player);
      ctx.restore();
    } else {
      drawNinjaPlayer(ctx, player);
    }
    // Draw the active hiding spot on top of the player so they appear inside it
    if (player.hidingAt) drawHidingSpot(ctx, player.hidingAt);
  }

  for (const t of floatingTexts) t.draw(ctx);

  // ── Ammo counter above ninja (shown briefly after each throw) ──────────────
  if (player && ammoDisplayTimer > 0) {
    const alpha = Math.min(1, ammoDisplayTimer * 1.4);
    const px = player.x + player.w / 2;
    const py = player.y - 22;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(`×${throwAmmo}`, px, py);
    ctx.fillStyle = throwAmmo === 0 ? '#ff4444' : '#ffffff';
    ctx.fillText(`×${throwAmmo}`, px, py);
    ctx.restore();
  }

  ctx.restore();


  if (gameState === STATE.PLAYING) {
    HUD.draw(ctx, { playerHp, score, level, combo, boss, playerWeapon, gemPower, camX: cam.x, levelWidth, throwAmmo });
  } else if (gameState === STATE.LEVEL_COMPLETE) {
    UI.drawLevelComplete(ctx, dt, C.LEVEL_DATA[currentLevelIdx].name, level, currentLevelIdx >= C.LEVEL_DATA.length - 1);
  } else if (gameState === STATE.GAMEOVER) {
    UI.drawGameOver(ctx, score, kills, level, mouse);
  } else if (gameState === STATE.SUBMIT) {
    UI.drawScoreSubmit(ctx);
  } else if (gameState === STATE.LEADERBOARD) {
    UI.drawLeaderboard(ctx, leaderboard, submitRank, mouse);
  } else if (gameState === STATE.VICTORY) {
    UI.drawVictory(ctx, dt, score, kills, mouse);
  }

  UI.drawHitFlash(ctx, screenFlash);
  UI.drawLevelUp(ctx, dt, level);

  // FPS + frame-time overlay
  ctx.save();
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = _fpsDisplay > 0 && _fpsDisplay < 40 ? '#ff6060' : '#00e070';
  ctx.fillText(_fpsDisplay + ' fps', C.W - 4, 13);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(`upd:${_diagUpdateMs.toFixed(1)}ms drw:${_diagDrawMs.toFixed(1)}ms`, C.W - 4, 25);
  ctx.restore();
}
