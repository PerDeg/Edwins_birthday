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

function drawBox(ctx, spot) {
  if (typeof Sprites !== 'undefined' &&
      Sprites.drawRotated(ctx, 'prop-box',
        spot.x + spot.w / 2, spot.y + spot.h / 2,
        spot.w, spot.h, (spot.rotation || 0) * Math.PI / 180)) return;
  // Fallback: wooden crate
  const { x, y, w, h } = spot;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((spot.rotation || 0) * Math.PI / 180);
  ctx.fillStyle = '#8b5e2b';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, h / 2);
  ctx.moveTo(w / 2, -h / 2);  ctx.lineTo(-w / 2, h / 2);
  ctx.stroke();
  ctx.restore();
}

function drawLadder(ctx, l) {
  if (typeof Sprites !== 'undefined' &&
      Sprites.drawTiled(ctx, 'prop-ladder',
        l.x, l.y, l.w, l.h, (l.rotation || 0) * Math.PI / 180)) return;
  // Fallback: rails + rungs
  const { x, y, w, h } = l;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((l.rotation || 0) * Math.PI / 180);
  ctx.strokeStyle = '#c8a83c'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 3, -h / 2); ctx.lineTo(-w / 2 + 3, h / 2);
  ctx.moveTo(w / 2 - 3,  -h / 2); ctx.lineTo(w / 2 - 3,  h / 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  const rungStep = 14;
  const rungCount = Math.floor(h / rungStep);
  for (let i = 0; i <= rungCount; i++) {
    const ry = -h / 2 + i * rungStep;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 3, ry); ctx.lineTo(w / 2 - 3, ry); ctx.stroke();
  }
  ctx.restore();
}

function drawSpike(ctx, s) {
  if (typeof Sprites !== 'undefined' &&
      Sprites.drawRotated(ctx, 'prop-spike',
        s.x + s.w / 2, s.y + s.h / 2,
        s.w, s.h, (s.rotation || 0) * Math.PI / 180)) return;
  // Fallback: row of triangles
  const { x, y, w, h } = s;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((s.rotation || 0) * Math.PI / 180);
  ctx.fillStyle = '#b0b0b0';
  const tipCount = 4, tw = w / tipCount;
  for (let i = 0; i < tipCount; i++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + i * tw,         h / 2);
    ctx.lineTo(-w / 2 + (i + 0.5) * tw, -h / 2 + h * 0.18);
    ctx.lineTo(-w / 2 + (i + 1) * tw,   h / 2);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawHidingSpot(ctx, spot) {
  if (spot.type === 'barrel') drawBarrel(ctx, spot.x, spot.y, spot.w, spot.h);
  else if (spot.type === 'box') drawBox(ctx, spot);
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

  for (const l of ladders) {
    if (l.x + l.w < cam.x - 20 || l.x > cam.x + C.W + 20) continue;
    drawLadder(ctx, l);
  }

  for (const s of spikes) {
    if (s.x + s.w < cam.x - 20 || s.x > cam.x + C.W + 20) continue;
    drawSpike(ctx, s);
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
    if (player.dashing) {
      // Ghost after-images trailing behind the dash
      const _origX = player.x;
      const _origInv = player.invincible;
      player.invincible = 0;
      for (let i = 3; i >= 1; i--) {
        player.x = _origX - player.dashDir * i * 18;
        ctx.save();
        ctx.globalAlpha = 0.22 / i;
        drawNinjaPlayer(ctx, player);
        ctx.restore();
      }
      player.x = _origX;
      player.invincible = _origInv;
      // Fire aura — elongated glow in dash direction, trail behind
      const flicker = 0.75 + Math.sin(Date.now() * 0.06) * 0.25;
      const cx = player.x + player.w / 2 + player.dashDir * 8;
      const cy = player.y + player.h * 0.45;
      ctx.save();
      ctx.globalAlpha = flicker * 0.82;
      const g = ctx.createRadialGradient(cx, cy, 3, cx, cy, 40);
      g.addColorStop(0,   '#ffffff');
      g.addColorStop(0.2, '#ffdd00');
      g.addColorStop(0.55,'#ff5500');
      g.addColorStop(1,   'rgba(255,60,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, player.w * 1.7, player.h * 1.0, 0, 0, Math.PI * 2);
      ctx.fill();
      // Trailing streak on opposite side
      const tx = player.x + player.w / 2 - player.dashDir * player.w * 1.4;
      const tg = ctx.createRadialGradient(tx, cy, 1, tx, cy, 26);
      tg.addColorStop(0, '#ffcc00'); tg.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.globalAlpha = flicker * 0.55;
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.ellipse(tx, cy, player.w * 1.1, player.h * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
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
