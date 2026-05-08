'use strict';

// ── HUD drawing (always in screen / logical space) ───────────────────────────
const HUD = (() => {

  function drawHeartIcon(ctx, cx, cy, size, full) {
    ctx.globalAlpha = full ? 1 : 0.22;
    if (typeof Sprites !== 'undefined' && Sprites.has('heart')) {
      Sprites.drawRotated(ctx, 'heart', cx, cy, size * 2, size * 2, 0);
    } else {
      // Fallback heart shape
      ctx.fillStyle = '#e63946';
      ctx.save(); ctx.translate(cx, cy - size * 0.2);
      ctx.beginPath();
      ctx.moveTo(0, size * 0.5);
      ctx.bezierCurveTo(0, -size * 0.3, -size, -size * 0.3, -size, size * 0.4);
      ctx.bezierCurveTo(-size, size, 0, size * 1.4, 0, size * 1.4);
      ctx.bezierCurveTo(0, size * 1.4, size, size, size, size * 0.4);
      ctx.bezierCurveTo(size, -size * 0.3, 0, -size * 0.3, 0, size * 0.5);
      ctx.fill(); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  let comboPop = 1, prevCombo = 1;

  function draw(ctx, state) {
    const { playerHp, score, level, combo, boss, playerWeapon, gemPower, camX, levelWidth, throwAmmo } = state;

    // ── Dynamic HP bar ──
    const hpFrac = Math.max(0, Math.min(1, (playerHp || 0) / C.PLAYER_HP));
    const bw = 130, bh = 12, bx = 22, by = 8;
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#2a0000';
    ctx.fillRect(bx, by, bw, bh);
    // Fill — green → yellow → red
    const hpCol = hpFrac > 0.55 ? '#22cc44' : hpFrac > 0.25 ? '#ddaa00' : '#dd2222';
    ctx.fillStyle = hpCol;
    ctx.fillRect(bx, by, bw * hpFrac, bh);
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    // Percentage text
    ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.ceil(playerHp || 0)}%`, bx + bw / 2, by + bh - 1);
    // Heart icon to the left
    ctx.font = '15px system-ui'; ctx.textAlign = 'right';
    ctx.fillStyle = '#e63946';
    ctx.fillText('♥', bx - 2, by + bh);

    // ── Gem power indicator ──
    if (gemPower) {
      ctx.save();
      ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'left';
      ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.006) * 0.3;
      ctx.fillStyle = '#a0f0ff';
      ctx.fillText('✦ GEM-KRAFT  [Z]', 14, 36);
      ctx.globalAlpha = 1; ctx.restore();
    }

    // ── Score ──
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.COL_GOLD;
    ctx.fillText(score.toLocaleString('sv'), C.W / 2, 30);

    // ── Level label ──
    ctx.font = '13px system-ui';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(200,168,60,0.7)';
    ctx.fillText(`NIVÅ ${level}`, C.W - 14, 22);

    // ── Combo pop ──
    if (combo !== prevCombo && combo > 1) { comboPop = 1.85; prevCombo = combo; }
    if (comboPop > 1) comboPop = Math.max(1, comboPop - 0.08);
    if (combo > 1) {
      ctx.save();
      ctx.translate(70, C.H - 52); ctx.scale(comboPop, comboPop);
      ctx.font = 'bold 26px system-ui'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ff6b35';
      ctx.fillText(`×${combo} COMBO!`, 0, 0);
      ctx.restore();
    }

    // ── Weapon indicator ──
    if (playerWeapon && playerWeapon !== 'sword') {
      const labels = { shuriken: '✦ KASTSTJÄRNA', triple: '✦✦✦ TRIPPELSTJÄRNA', knife: '» KNIV', banana: '🍌 BANANSKALET' };
      const weaponCol = playerWeapon === 'banana' ? '#f5d53a' : '#4fc3f7';
      const ammoStr = throwAmmo != null ? `  ×${throwAmmo}  [X]` : '  [X]';
      ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'right';
      ctx.fillStyle = weaponCol;
      ctx.fillText((labels[playerWeapon] || playerWeapon) + ammoStr, C.W - 14, C.H - 16);
      ctx.textAlign = 'left';
    }

    // ── Boss HP bar ──
    if (boss && boss.alive && boss.seenByPlayer) {
      const bw = 300, bh = 16, bx = (C.W - bw) / 2, by = 44;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      ctx.fillStyle = '#440000'; ctx.fillRect(bx, by, bw, bh);
      const frac = Math.max(0, boss.hp / boss.maxHp);
      ctx.fillStyle = frac > 0.55 ? '#cc2222' : frac > 0.28 ? '#dd6600' : '#ff2222';
      ctx.fillRect(bx, by, bw * frac, bh);
      ctx.strokeStyle = 'rgba(255,80,80,0.6)'; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh); ctx.lineWidth = 1;
      ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.fillText('BOSS', C.W / 2, by + bh - 3);
    }

    // ── Level progress strip ──
    if (levelWidth && camX !== undefined) {
      const prog = Math.min(1, (camX + C.W) / levelWidth);
      ctx.fillStyle = 'rgba(200,168,60,0.12)'; ctx.fillRect(0, C.H - 4, C.W, 4);
      ctx.fillStyle = 'rgba(200,168,60,0.55)'; ctx.fillRect(0, C.H - 4, C.W * prog, 4);
      ctx.fillStyle = C.COL_RED; ctx.fillRect(C.W - 5, C.H - 8, 5, 8);
    }

    ctx.textAlign = 'left';
  }

  function reset() { comboPop = 1; prevCombo = 1; }

  return { draw, reset };
})();
