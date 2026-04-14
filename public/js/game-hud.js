'use strict';

// ── HUD drawing (always in screen / logical space) ───────────────────────────
const HUD = (() => {

  function drawShurikenIcon(ctx, cx, cy, size = 10) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = C.COL_GOLD;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -size); ctx.lineTo(size * 0.35, -size * 0.28);
      ctx.lineTo(0, 0); ctx.lineTo(-size * 0.35, -size * 0.28);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  let comboPop = 1;   // current scale for combo pop animation
  let prevCombo = 1;

  function draw(ctx, state) {
    const { lives, score, level, combo, difficulty } = state;

    // ── Lives (shuriken icons top-left) ──
    for (let i = 0; i < C.DIFF[difficulty].lives; i++) {
      const filled = i < lives;
      ctx.globalAlpha = filled ? 1 : 0.22;
      drawShurikenIcon(ctx, 22 + i * 28, 22, 10);
    }
    ctx.globalAlpha = 1;

    // ── Score (top-center) ──
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.COL_GOLD;
    ctx.fillText(score.toLocaleString('sv'), C.W / 2, 30);

    // ── Level (top-right) ──
    ctx.font = '13px system-ui';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(200,168,60,0.7)';
    ctx.fillText(`NIVÅ ${level}`, C.W - 14, 22);

    // ── Combo pop (bottom-left when > 1) ──
    if (combo !== prevCombo && combo > 1) { comboPop = 1.85; prevCombo = combo; }
    if (comboPop > 1) comboPop = Math.max(1, comboPop - 0.08);

    if (combo > 1) {
      ctx.save();
      ctx.translate(70, C.H - 36);
      ctx.scale(comboPop, comboPop);
      ctx.font = `bold 26px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff6b35';
      ctx.fillText(`×${combo} COMBO!`, 0, 0);
      ctx.restore();
    }

    ctx.textAlign = 'left';
  }

  function reset() { comboPop = 1; prevCombo = 1; }

  return { draw, reset };
})();
