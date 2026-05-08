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

// ── Enemy detection indicator ─────────────────────────────────────────────────
function drawDetectionCone(ctx, e) {
  const cx = e.x + e.w / 2;

  if (e.aiState === 'patrol') {
    // Show Zzz when grunt is standing still at a platform edge
    if (e.patrolWait > 1.0) {
      const t = Date.now() * 0.0028;
      const alpha = Math.min(0.9, (e.patrolWait - 1.0) * 1.2);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#aaaaee';
      ctx.font = 'bold 11px system-ui';
      ctx.fillText('z', cx + 7,  e.y - 10 + Math.sin(t) * 1.5);
      ctx.font = 'bold 15px system-ui';
      ctx.fillText('Z', cx + 15, e.y - 21 + Math.sin(t + 1.1) * 1.5);
      ctx.restore();
    }
    return;
  }

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
    // Moving platform: draw pulsing arrows indicating direction
    if (p.moving) {
      const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
      ctx.save();
      ctx.globalAlpha = 0.55 * pulse;
      ctx.fillStyle = '#a0e8ff';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      const sym = p.axis === 'x' ? '◀ ▶' : '▲ ▼';
      ctx.fillText(sym, p.x + p.w / 2, p.y - 3);
      ctx.restore();
    }
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
    if (e.x + e.w < cam.x - 20 || e.x > cam.x + C.W + 20) continue;
    if (e.dying) {
      const alpha = Math.max(0, e.dyingTimer / 0.55);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      ctx.rotate(e.dyingRot || 0);
      ctx.translate(-e.w / 2, -e.h / 2);
      if (e.type === 'archer') drawArcher(ctx, { ...e, x: 0, y: 0, hitFlash: 0 });
      else drawGrunt(ctx, { ...e, x: 0, y: 0, hitFlash: 0 });
      ctx.restore();
      continue;
    }
    if (!e.alive) continue;
    if (e.type === 'grunt') drawDetectionCone(ctx, e);
    else if (e.type === 'archer' && e.lostPlayerTimer > 0) {
      const alpha = Math.min(1, e.lostPlayerTimer);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffdd00';
      ctx.fillText('?', e.x + e.w / 2, e.y - 14);
      ctx.restore();
    }
    if (e.slipping) {
      // Spin the grunt sideways while sliding
      ctx.save();
      ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      ctx.rotate(e.slipRot);
      drawGrunt(ctx, { ...e, x: -e.w / 2, y: -e.h / 2 });
      ctx.restore();
    } else {
      e.type === 'archer' ? drawArcher(ctx, e) : drawGrunt(ctx, e);
    }
    drawEnemyHpBar(ctx, e);
    if (e.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = (e.hitFlash / 0.14) * 0.65;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(e.x - 2, e.y - 2, e.w + 4, e.h + 4);
      ctx.restore();
    }
  }

  for (const s of shurikens) {
    if (s.x < cam.x - 40 || s.x > cam.x + C.W + 40) continue;
    // Trail
    if (s.trail) {
      for (let i = 0; i < s.trail.length; i++) {
        const t = s.trail[i];
        const frac = (i + 1) / s.trail.length;
        ctx.save();
        ctx.globalAlpha = frac * 0.45;
        ctx.fillStyle = i > s.trail.length * 0.5 ? '#ff6600' : '#ffcc00';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 2 + frac * 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    // Glow ring
    ctx.save();
    ctx.globalAlpha = 0.5;
    const _sg = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, 14);
    _sg.addColorStop(0, 'rgba(255,100,0,0.9)');
    _sg.addColorStop(1, 'rgba(255,30,0,0)');
    ctx.fillStyle = _sg;
    ctx.beginPath(); ctx.arc(s.x, s.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawShuriken(ctx, s.x, s.y, s.rot);
  }
  for (const s of playerShurikens) {
    if (s.x < cam.x - 40 || s.x > cam.x + C.W + 40) continue;
    s.draw(ctx);
  }

  if (boss && boss.alive) {
    drawBoss(ctx, boss);
    if (boss.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = (boss.hitFlash / 0.18) * 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(boss.x - 4, boss.y - 4, boss.w + 8, boss.h + 8);
      ctx.restore();
    }
  }
  if (player) {
    // Ambush arc — depleting ring drawn around the hiding spot
    if (player.hidingAt && player.ambushWindow > 0) {
      const frac  = player.ambushWindow / C.AMBUSH_WINDOW;
      const s     = player.hidingAt;
      const acx   = s.x + s.w / 2;
      const acy   = s.y + s.h / 2;
      const r     = Math.max(s.w, s.h) * 0.95 + 9;
      const col   = frac > 0.45 ? '#ffe040' : '#ff6020';
      const pulse = 0.72 + Math.sin(Date.now() * 0.012) * 0.28;
      ctx.save();
      ctx.globalAlpha = pulse * 0.92;
      ctx.strokeStyle = col; ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(acx, acy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
      ctx.stroke();
      const tipA = -Math.PI / 2 + Math.PI * 2 * frac;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(acx + Math.cos(tipA) * r, acy + Math.sin(tipA) * r, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Ambush-ready glow — player flashes gold during the exit grace window
    if (player.ambushReady > 0 && !player.hiding) {
      const frac  = player.ambushReady / C.AMBUSH_GRACE;
      const pulse = 0.55 + Math.sin(Date.now() * 0.028) * 0.45;
      ctx.save();
      ctx.globalAlpha = frac * pulse * 0.75;
      ctx.fillStyle = '#ffe040';
      ctx.beginPath();
      ctx.ellipse(player.x + player.w / 2, player.y + player.h / 2,
        player.w * 1.5, player.h * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

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

    // Dash cooldown arc — shown while recharging (not during dash itself)
    if (!player.dashing && player.dashCooldown > 0) {
      const frac = 1 - player.dashCooldown / C.DASH_COOLDOWN;
      const cx = player.x + player.w / 2;
      const cy = player.y + player.h * 0.85;
      const r = 18;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = 'rgba(80,80,80,0.5)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2, false);
      ctx.stroke();
      ctx.strokeStyle = frac > 0.85 ? '#88ffcc' : '#4fc3f7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
      ctx.stroke();
      ctx.restore();
    }

    // Draw the active hiding spot on top of the player so they appear inside it
    if (player.hidingAt) drawHidingSpot(ctx, player.hidingAt);
  }

  // Ground pound shockwave ring
  if (typeof groundPoundWave !== 'undefined' && groundPoundWave) {
    const frac = groundPoundWave.timer / 0.38;
    ctx.save();
    ctx.globalAlpha = frac * 0.72;
    ctx.strokeStyle = '#ddbb44';
    ctx.lineWidth = 4 + (1 - frac) * 7;
    ctx.beginPath();
    ctx.ellipse(groundPoundWave.x, groundPoundWave.y, groundPoundWave.r, groundPoundWave.r * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = frac * 0.25;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(groundPoundWave.x, groundPoundWave.y, groundPoundWave.r * 0.65, groundPoundWave.r * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Gem shockwave ring
  if (gemWave) {
    const frac = gemWave.timer / 0.55;
    ctx.save();
    ctx.globalAlpha = frac * 0.8;
    ctx.strokeStyle = '#a0f0ff';
    ctx.lineWidth = 4 + (1 - frac) * 8;
    ctx.beginPath();
    ctx.arc(gemWave.x, gemWave.y, gemWave.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = frac * 0.3;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(gemWave.x, gemWave.y, gemWave.r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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

  // Low HP vignette — pulsing red edges below 30 HP
  if (player && playerHp > 0 && playerHp < 30 && gameState === STATE.PLAYING) {
    const t     = (30 - playerHp) / 30;
    const pulse = 0.20 + Math.sin(Date.now() * 0.007) * 0.18;
    const g = ctx.createRadialGradient(C.W/2, C.H/2, C.H * 0.18, C.W/2, C.H/2, C.H * 0.88);
    g.addColorStop(0, 'rgba(180,0,0,0)');
    g.addColorStop(1, `rgba(200,0,0,${(t * pulse).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, C.W, C.H);
  }

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
