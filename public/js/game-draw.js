'use strict';

// ── Enemy detection cone + indicator ─────────────────────────────────────────
function drawDetectionCone(ctx, e) {
  if (e.aiState === 'patrol') return;
  const cx = e.x + e.w / 2;

  // Cone fill — yellow for suspect, red for alert
  const pct   = e.aiState === 'suspect' ? e.detectTimer / C.DETECTION_TIME : 1;
  const alpha = e.aiState === 'alert' ? 0.18 : 0.13 * pct;
  ctx.fillStyle = e.aiState === 'alert'
    ? `rgba(255,50,50,${alpha})`
    : `rgba(255,210,0,${alpha})`;
  const x0 = e.facing > 0 ? cx : cx - C.DETECTION_RANGE;
  ctx.fillRect(x0, e.y - 24, C.DETECTION_RANGE, e.h + 48);

  // "?" / "!" above head
  const label = e.aiState === 'alert' ? '!' : '?';
  const col   = e.aiState === 'alert' ? '#ff4040' : '#ffdd00';
  ctx.save();
  ctx.font = 'bold 20px system-ui';
  ctx.textAlign = 'center';
  ctx.fillStyle = col;
  ctx.fillText(label, cx, e.y - 16);

  // Progress bar (suspect only)
  if (e.aiState === 'suspect') {
    const bw = 28, bh = 4, bx = cx - 14, by = e.y - 9;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#ffdd00';
    ctx.fillRect(bx, by, bw * pct, bh);
  }
  ctx.restore();
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

// ── Main draw ──────────────────────────────────────────────────────────────────
function draw(dt) {
  ctx.clearRect(0, 0, C.W, C.H);

  if (gameState === STATE.MENU) {
    UI.drawMenu(ctx, dt, leaderboard);
    return;
  }

  Background.drawBackground(ctx, cam.x);

  ctx.save();
  ctx.translate(-cam.x + cam.shake, cam.shake * 0.4);

  // Skip programmatic ground when the level bg image (which includes its own ground) is loaded
  if (typeof Sprites === 'undefined' || !Sprites.has('bg-level' + (bgTheme + 1))) {
    Background.drawGround(ctx, cam.x);
  }

  for (const p of platforms) {
    if (p.x + p.w < cam.x - 20 || p.x > cam.x + C.W + 20) continue;
    drawPlatform(ctx, p);
  }

  for (const p of particles) p.draw(ctx);

  for (const c of coins) {
    if (!c.alive || c.x + 20 < cam.x - 30 || c.x > cam.x + C.W + 30) continue;
    c.draw(ctx);
  }
  for (const p of pickups) {
    if (!p.alive || p.x + 30 < cam.x - 30 || p.x > cam.x + C.W + 30) continue;
    p.draw(ctx);
  }

  for (const e of enemies) {
    if (!e.alive || e.x + e.w < cam.x - 20 || e.x > cam.x + C.W + 20) continue;
    if (e.type === 'grunt') drawDetectionCone(ctx, e);
    e.type === 'archer' ? drawArcher(ctx, e) : drawGrunt(ctx, e);
  }

  for (const s of shurikens)       drawShuriken(ctx, s.x, s.y, s.rot);
  for (const s of playerShurikens) s.draw(ctx);

  if (boss && boss.alive) drawBoss(ctx, boss);
  if (player) {
    // Gem power: draw cyan glow halo around player
    if (gemPower) {
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
    drawNinjaPlayer(ctx, player);
  }

  for (const t of floatingTexts) t.draw(ctx);

  ctx.restore();


  if (gameState === STATE.PLAYING) {
    HUD.draw(ctx, { lives, score, level, combo, boss, playerWeapon, gemPower, camX: cam.x, levelWidth });
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
}
