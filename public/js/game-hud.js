'use strict';

// ── HUD drawing (always in screen / logical space) ───────────────────────────
const HUD = (() => {

  function drawShurikenIcon(ctx, cx, cy, size = 10) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = C.COL_GOLD;
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0,-size); ctx.lineTo(size*0.35,-size*0.28);
      ctx.lineTo(0,0); ctx.lineTo(-size*0.35,-size*0.28);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  let comboPop = 1, prevCombo = 1;

  function draw(ctx, state) {
    const { lives, score, level, combo, difficulty, boss, playerWeapon, camX, levelWidth } = state;

    // ── Lives ──
    for (let i = 0; i < C.DIFF[difficulty].lives; i++) {
      ctx.globalAlpha = i < lives ? 1 : 0.22;
      drawShurikenIcon(ctx, 22 + i * 28, 22, 10);
    }
    ctx.globalAlpha = 1;

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
      ctx.translate(70, C.H - 52);
      ctx.scale(comboPop, comboPop);
      ctx.font = 'bold 26px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff6b35';
      ctx.fillText(`×${combo} COMBO!`, 0, 0);
      ctx.restore();
    }

    // ── Weapon indicator ──
    if (playerWeapon && playerWeapon !== 'sword') {
      const labels = { shuriken: '✦ KASTST.', triple: '✦✦✦ TRIPPEL', knife: '» KNIV' };
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#4fc3f7';
      ctx.fillText(labels[playerWeapon] || playerWeapon, C.W - 14, C.H - 16);
      ctx.textAlign = 'left';
    }

    // ── Boss HP bar ──
    if (boss && boss.alive) {
      const bw = 300, bh = 16, bx = (C.W - bw) / 2, by = 44;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      ctx.fillStyle = '#440000';
      ctx.fillRect(bx, by, bw, bh);
      const frac = Math.max(0, boss.hp / boss.maxHp);
      const barCol = frac > 0.55 ? '#cc2222' : frac > 0.28 ? '#dd6600' : '#ff2222';
      ctx.fillStyle = barCol;
      ctx.fillRect(bx, by, bw * frac, bh);
      ctx.strokeStyle = 'rgba(255,80,80,0.6)'; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh); ctx.lineWidth = 1;
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('BOSS', C.W / 2, by + bh - 3);
    }

    // ── Level progress strip (bottom) ──
    if (levelWidth && camX !== undefined) {
      const prog = Math.min(1, (camX + C.W) / levelWidth);
      ctx.fillStyle = 'rgba(200,168,60,0.12)';
      ctx.fillRect(0, C.H - 4, C.W, 4);
      ctx.fillStyle = 'rgba(200,168,60,0.55)';
      ctx.fillRect(0, C.H - 4, C.W * prog, 4);
      // Boss skull marker at right end
      ctx.fillStyle = C.COL_RED;
      ctx.fillRect(C.W - 5, C.H - 8, 5, 8);
    }

    ctx.textAlign = 'left';
  }

  function reset() { comboPop = 1; prevCombo = 1; }

  return { draw, reset };
})();
