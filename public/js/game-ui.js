'use strict';

// ── UI Screens drawn onto the game canvas ────────────────────────────────────
const UI = (() => {

  // Shared overlay backdrop
  function overlay(ctx, alpha = 0.72) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, C.W, C.H);
  }

  function centreText(ctx, text, y, font, color) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, C.W / 2, y);
  }

  function button(ctx, label, cx, cy, w, h, hovered) {
    ctx.fillStyle = hovered ? 'rgba(200,168,60,0.28)' : 'rgba(200,168,60,0.10)';
    ctx.strokeStyle = hovered ? C.COL_GOLD : 'rgba(200,168,60,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - w/2, cy - h/2, w, h, 4);
    ctx.fill(); ctx.stroke();
    ctx.font = 'bold 16px system-ui';
    ctx.fillStyle = C.COL_GOLD;
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy + 6);
    ctx.lineWidth = 1;
  }

  // ── MENU ──────────────────────────────────────────────────────────────────
  let menuAnim = 0;
  function drawMenu(ctx, dt, mouse) {
    menuAnim += dt;
    overlay(ctx, 0.78);

    // Title
    ctx.font = 'bold 52px system-ui';
    ctx.textAlign = 'center';
    const glow = 0.3 + Math.sin(menuAnim * 2) * 0.15;
    ctx.shadowColor = C.COL_GOLD;
    ctx.shadowBlur  = 18 + Math.sin(menuAnim * 2) * 8;
    ctx.fillStyle = C.COL_GOLD;
    ctx.fillText('EDWINS', C.W / 2, C.H / 2 - 90);
    ctx.font = 'bold 38px system-ui';
    ctx.fillText('NINJAÄVENTYR', C.W / 2, C.H / 2 - 48);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    ctx.font = '16px system-ui';
    ctx.fillStyle = 'rgba(200,168,60,0.65)';
    ctx.fillText('Välj svårighetsgrad för att börja', C.W / 2, C.H / 2);

    const hoverBarn  = mouse && inBtn(mouse, C.W/2 - 100, C.H/2 + 42, 160, 46);
    const hoverVuxen = mouse && inBtn(mouse, C.W/2 + 100, C.H/2 + 42, 160, 46);

    button(ctx, 'BARN  (enklare)', C.W/2 - 100, C.H/2 + 42, 160, 46, hoverBarn);
    button(ctx, 'VUXEN (svårare)', C.W/2 + 100, C.H/2 + 42, 160, 46, hoverVuxen);

    ctx.font = '13px system-ui';
    ctx.fillStyle = 'rgba(200,168,60,0.45)';
    ctx.fillText('Piltangenter / WASD · Mellanslag = hopp · Z = attack', C.W/2, C.H/2 + 106);
    ctx.textAlign = 'left';

    return { hoverBarn, hoverVuxen };
  }

  // ── LEVEL UP FLASH ────────────────────────────────────────────────────────
  let levelUpTimer = 0;
  function triggerLevelUp() { levelUpTimer = 2.0; }
  function drawLevelUp(ctx, dt, level) {
    if (levelUpTimer <= 0) return false;
    levelUpTimer -= dt;
    const alpha = Math.min(1, levelUpTimer) * 0.85;
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.5})`;
    ctx.fillRect(0, 0, C.W, C.H);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 54px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.COL_GOLD;
    ctx.fillText(`NIVÅ ${level}!`, C.W/2, C.H/2);
    ctx.font = '22px system-ui';
    ctx.fillStyle = '#fff';
    ctx.fillText('Fienderna blir starkare!', C.W/2, C.H/2 + 44);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    return true;
  }

  // ── GAME OVER ─────────────────────────────────────────────────────────────
  function drawGameOver(ctx, score, kills, level, mouse) {
    overlay(ctx, 0.85);
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.COL_RED;
    ctx.fillText('GAME OVER', C.W/2, C.H/2 - 110);

    ctx.font = '20px system-ui';
    ctx.fillStyle = C.COL_GOLD;
    ctx.fillText(`Poäng: ${score.toLocaleString('sv')}`, C.W/2, C.H/2 - 62);
    ctx.fillStyle = '#ccc';
    ctx.font = '15px system-ui';
    ctx.fillText(`Nivå ${level}  ·  ${kills} fiender besegrade`, C.W/2, C.H/2 - 36);

    const hoverSubmit  = mouse && inBtn(mouse, C.W/2, C.H/2 + 10, 220, 48);
    const hoverRestart = mouse && inBtn(mouse, C.W/2, C.H/2 + 74, 220, 42);

    button(ctx, 'SKICKA IN POÄNG', C.W/2, C.H/2 + 10, 220, 48, hoverSubmit);
    button(ctx, 'SPELA IGEN',       C.W/2, C.H/2 + 74, 220, 42, hoverRestart);
    ctx.textAlign = 'left';
    return { hoverSubmit, hoverRestart };
  }

  // ── SCORE SUBMIT ──────────────────────────────────────────────────────────
  function drawScoreSubmit(ctx) {
    overlay(ctx, 0.88);
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.COL_GOLD;
    ctx.fillText('Ange ditt namn', C.W/2, C.H/2 - 60);
    ctx.textAlign = 'left';
  }

  // ── LEADERBOARD ───────────────────────────────────────────────────────────
  function drawLeaderboard(ctx, rows, rank, mouse) {
    overlay(ctx, 0.90);
    ctx.font = 'bold 30px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.COL_GOLD;
    ctx.fillText('TOPPLISTA', C.W/2, 80);

    if (rank) {
      ctx.font = '16px system-ui';
      ctx.fillStyle = '#ccc';
      ctx.fillText(`Du kom på plats #${rank}!`, C.W/2, 108);
    }

    const startY = 136;
    const rowH   = 34;
    rows.forEach((r, i) => {
      const y = startY + i * rowH;
      const isMe = rank && i + 1 === rank;
      ctx.fillStyle = isMe ? 'rgba(200,168,60,0.18)' : (i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent');
      ctx.fillRect(C.W/2 - 260, y - 18, 520, rowH - 2);

      ctx.font = isMe ? 'bold 15px system-ui' : '15px system-ui';
      ctx.textAlign = 'left';
      ctx.fillStyle = isMe ? C.COL_GOLD : '#ddd';
      ctx.fillText(`${i+1}.`, C.W/2 - 250, y);
      ctx.fillText(r.name, C.W/2 - 220, y);
      ctx.textAlign = 'right';
      ctx.fillText(Number(r.score).toLocaleString('sv'), C.W/2 + 260, y);
    });

    const hoverBack = mouse && inBtn(mouse, C.W/2, startY + rows.length * rowH + 44, 180, 42);
    button(ctx, 'SPELA IGEN', C.W/2, startY + rows.length * rowH + 44, 180, 42, hoverBack);

    ctx.textAlign = 'left';
    return { hoverBack };
  }

  // ── Hit overlay ───────────────────────────────────────────────────────────
  function drawHitFlash(ctx, intensity) {
    if (intensity <= 0) return;
    ctx.fillStyle = `rgba(200,0,0,${intensity * 0.32})`;
    ctx.fillRect(0, 0, C.W, C.H);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function inBtn(mouse, cx, cy, w, h) {
    return mouse.x >= cx - w/2 && mouse.x <= cx + w/2 &&
           mouse.y >= cy - h/2 && mouse.y <= cy + h/2;
  }

  return { drawMenu, drawGameOver, drawScoreSubmit, drawLeaderboard,
           drawHitFlash, drawLevelUp, triggerLevelUp, inBtn };
})();
