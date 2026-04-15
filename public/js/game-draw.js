'use strict';

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
  const grad = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
  grad.addColorStop(0,   '#5a7a2a');
  grad.addColorStop(0.3, '#3a5a1a');
  grad.addColorStop(1,   '#2a3a14');
  ctx.fillStyle = grad;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = '#8aba3a';
  ctx.fillRect(p.x, p.y, p.w, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
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

  Background.drawGround(ctx, cam.x);

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

  for (const p of petals) p.draw(ctx);

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
