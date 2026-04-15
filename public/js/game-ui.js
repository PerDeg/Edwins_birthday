'use strict';

// ── UI Screens drawn onto the game canvas ────────────────────────────────────
const UI = (() => {

  function overlay(ctx, alpha = 0.72) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, C.W, C.H);
  }

  function button(ctx, label, cx, cy, w, h, hovered) {
    ctx.fillStyle   = hovered ? 'rgba(200,168,60,0.28)' : 'rgba(200,168,60,0.10)';
    ctx.strokeStyle = hovered ? C.COL_GOLD : 'rgba(200,168,60,0.45)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.roundRect(cx-w/2, cy-h/2, w, h, 4); ctx.fill(); ctx.stroke();
    ctx.font = 'bold 16px system-ui'; ctx.fillStyle = C.COL_GOLD; ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy + 6);
    ctx.lineWidth = 1;
  }

  function inBtn(mouse, cx, cy, w, h) {
    return mouse.x >= cx-w/2 && mouse.x <= cx+w/2 && mouse.y >= cy-h/2 && mouse.y <= cy+h/2;
  }

  // ── MENU ──────────────────────────────────────────────────────────────────
  let menuAnim = 0;
  function drawMenu(ctx, dt, rows) {
    menuAnim += dt;
    overlay(ctx, 0.80);

    // Title
    ctx.textAlign = 'center';
    ctx.shadowColor = C.COL_GOLD; ctx.shadowBlur = 18 + Math.sin(menuAnim*2)*8;
    ctx.font = 'bold 52px system-ui'; ctx.fillStyle = C.COL_GOLD;
    ctx.fillText('EDWINS', C.W/2, 90);
    ctx.font = 'bold 36px system-ui';
    ctx.fillText('NINJAÄVENTYR', C.W/2, 134);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    // Leaderboard
    const bw = 480, bx = C.W/2 - bw/2;
    ctx.font = 'bold 14px system-ui'; ctx.fillStyle = 'rgba(200,168,60,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText('— TOPPLISTA —', C.W/2, 174);

    if (rows && rows.length) {
      const startY = 196, rowH = 30;
      rows.slice(0, 8).forEach((r, i) => {
        const y = startY + i * rowH;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent';
        ctx.fillRect(bx, y - 16, bw, rowH - 2);
        ctx.font = '14px system-ui'; ctx.textAlign = 'left';
        ctx.fillStyle = i === 0 ? C.COL_GOLD : '#ddd';
        ctx.fillText(`${i+1}.  ${r.name}`, bx + 14, y);
        ctx.textAlign = 'right';
        ctx.fillText(Number(r.score).toLocaleString('sv'), bx + bw - 14, y);
      });
    } else {
      ctx.font = '14px system-ui'; ctx.fillStyle = 'rgba(200,168,60,0.40)';
      ctx.textAlign = 'center';
      ctx.fillText('Inga poäng ännu — bli den första!', C.W/2, 220);
    }

    // Controls hint
    ctx.font = '12px system-ui'; ctx.fillStyle = 'rgba(200,168,60,0.38)';
    ctx.textAlign = 'center';
    ctx.fillText('Piltangenter/WASD · Mellanslag=hopp · Z=attack · X=kasta vapen', C.W/2, C.H - 28);
    ctx.textAlign = 'left';
  }

  // ── LEVEL UP FLASH ────────────────────────────────────────────────────────
  let levelUpTimer = 0, levelUpName = '';
  function triggerLevelUp(name) { levelUpTimer = 2.0; levelUpName = name || ''; }
  function drawLevelUp(ctx, dt, level) {
    if (levelUpTimer <= 0) return false;
    levelUpTimer -= dt;
    const alpha = Math.min(1, levelUpTimer) * 0.85;
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.5})`; ctx.fillRect(0,0,C.W,C.H);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 54px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = C.COL_GOLD;
    ctx.fillText(`NIVÅ ${level}!`, C.W/2, C.H/2);
    if (levelUpName) {
      ctx.font = 'bold 26px system-ui'; ctx.fillStyle = '#fff';
      ctx.fillText(levelUpName, C.W/2, C.H/2 + 48);
    } else {
      ctx.font = '22px system-ui'; ctx.fillStyle = '#fff';
      ctx.fillText('Fienderna blir starkare!', C.W/2, C.H/2 + 44);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    return true;
  }

  // ── LEVEL COMPLETE ────────────────────────────────────────────────────────
  let lcAnim = 0;
  function drawLevelComplete(ctx, dt, levelName, levelNum, isLast) {
    lcAnim += dt;
    overlay(ctx, 0.80);
    ctx.textAlign = 'center';

    ctx.shadowColor = C.COL_GOLD; ctx.shadowBlur = 20;
    ctx.font = 'bold 52px system-ui'; ctx.fillStyle = C.COL_GOLD;
    ctx.fillText('NIVÅ KLAR!', C.W/2, C.H/2 - 70);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    ctx.font = 'bold 26px system-ui'; ctx.fillStyle = '#fff';
    ctx.fillText(levelName, C.W/2, C.H/2 - 24);

    if (!isLast) {
      ctx.font = '18px system-ui'; ctx.fillStyle = 'rgba(200,168,60,0.75)';
      ctx.fillText('Klicka eller tryck för att fortsätta →', C.W/2, C.H/2 + 20);
    }

    // Sparkling stars
    ctx.fillStyle = C.COL_GOLD;
    for (let i = 0; i < 5; i++) {
      const a = (i/5)*Math.PI*2 + lcAnim;
      const r = 120 + Math.sin(lcAnim*2 + i)*20;
      const sx = C.W/2 + Math.cos(a)*r, sy = C.H/2 - 24 + Math.sin(a)*r*0.4;
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.textAlign = 'left';
  }

  // ── VICTORY ───────────────────────────────────────────────────────────────
  let victAnim = 0;
  function drawVictory(ctx, dt, score, kills, mouse) {
    victAnim += dt;
    overlay(ctx, 0.88);
    ctx.textAlign = 'center';

    // Rainbow-ish gold glow
    ctx.shadowColor = C.COL_GOLD; ctx.shadowBlur = 24 + Math.sin(victAnim*3)*10;
    ctx.font = 'bold 58px system-ui'; ctx.fillStyle = C.COL_GOLD;
    ctx.fillText('GRATTIS!', C.W/2, C.H/2 - 100);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    ctx.font = 'bold 22px system-ui'; ctx.fillStyle = '#fff';
    ctx.fillText('Alla 3 nivåer klarade! Edwin är en riktig ninja!', C.W/2, C.H/2 - 54);

    ctx.font = '20px system-ui'; ctx.fillStyle = C.COL_GOLD;
    ctx.fillText(`Slutpoäng: ${score.toLocaleString('sv')}`, C.W/2, C.H/2 - 14);
    ctx.font = '15px system-ui'; ctx.fillStyle = '#ccc';
    ctx.fillText(`${kills} fiender besegrade`, C.W/2, C.H/2 + 14);

    const hoverSubmit  = mouse && inBtn(mouse, C.W/2,    C.H/2+58, 230, 50);
    const hoverRestart = mouse && inBtn(mouse, C.W/2,    C.H/2+122, 180, 42);
    button(ctx, 'SKICKA IN POÄNG', C.W/2, C.H/2+58,  230, 50, hoverSubmit);
    button(ctx, 'SPELA IGEN',       C.W/2, C.H/2+122, 180, 42, hoverRestart);

    ctx.textAlign = 'left';
    return { hoverSubmit, hoverRestart };
  }

  // ── GAME OVER ─────────────────────────────────────────────────────────────
  function drawGameOver(ctx, score, kills, level, mouse) {
    overlay(ctx, 0.85);
    ctx.font = 'bold 48px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = C.COL_RED;
    ctx.fillText('GAME OVER', C.W/2, C.H/2-110);
    ctx.font = '20px system-ui'; ctx.fillStyle = C.COL_GOLD;
    ctx.fillText(`Poäng: ${score.toLocaleString('sv')}`, C.W/2, C.H/2-62);
    ctx.fillStyle = '#ccc'; ctx.font = '15px system-ui';
    ctx.fillText(`Nivå ${level}  ·  ${kills} fiender besegrade`, C.W/2, C.H/2-36);

    const hoverSubmit  = mouse && inBtn(mouse, C.W/2, C.H/2+10, 220, 48);
    const hoverRestart = mouse && inBtn(mouse, C.W/2, C.H/2+74, 220, 42);
    button(ctx, 'SKICKA IN POÄNG', C.W/2, C.H/2+10, 220, 48, hoverSubmit);
    button(ctx, 'SPELA IGEN',       C.W/2, C.H/2+74, 220, 42, hoverRestart);
    ctx.textAlign = 'left';
    return { hoverSubmit, hoverRestart };
  }

  // ── SCORE SUBMIT ──────────────────────────────────────────────────────────
  function drawScoreSubmit(ctx) {
    overlay(ctx, 0.88);
    ctx.font = 'bold 28px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = C.COL_GOLD;
    ctx.fillText('Ange ditt namn', C.W/2, C.H/2 - 60);
    ctx.textAlign = 'left';
  }

  // ── LEADERBOARD ───────────────────────────────────────────────────────────
  function drawLeaderboard(ctx, rows, rank, mouse) {
    overlay(ctx, 0.90);
    ctx.font = 'bold 30px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = C.COL_GOLD;
    ctx.fillText('TOPPLISTA', C.W/2, 80);
    if (rank) { ctx.font = '16px system-ui'; ctx.fillStyle = '#ccc'; ctx.fillText(`Du kom på plats #${rank}!`, C.W/2, 108); }

    const startY = 136, rowH = 34;
    rows.forEach((r, i) => {
      const y = startY + i * rowH;
      const isMe = rank && i+1 === rank;
      ctx.fillStyle = isMe ? 'rgba(200,168,60,0.18)' : (i%2===0 ? 'rgba(255,255,255,0.04)' : 'transparent');
      ctx.fillRect(C.W/2-260, y-18, 520, rowH-2);
      ctx.font = isMe ? 'bold 15px system-ui' : '15px system-ui';
      ctx.textAlign = 'left';  ctx.fillStyle = isMe ? C.COL_GOLD : '#ddd';
      ctx.fillText(`${i+1}.`, C.W/2-250, y);
      ctx.fillText(r.name, C.W/2-220, y);
      ctx.textAlign = 'right';
      ctx.fillText(Number(r.score).toLocaleString('sv'), C.W/2+260, y);
    });

    const hoverBack = mouse && inBtn(mouse, C.W/2, startY+rows.length*rowH+44, 180, 42);
    button(ctx, 'SPELA IGEN', C.W/2, startY+rows.length*rowH+44, 180, 42, hoverBack);
    ctx.textAlign = 'left';
    return { hoverBack };
  }

  // ── Hit flash ─────────────────────────────────────────────────────────────
  function drawHitFlash(ctx, intensity) {
    if (intensity <= 0) return;
    ctx.fillStyle = `rgba(200,0,0,${intensity * 0.32})`;
    ctx.fillRect(0, 0, C.W, C.H);
  }

  return {
    drawMenu, drawGameOver, drawScoreSubmit, drawLeaderboard,
    drawHitFlash, drawLevelUp, drawLevelComplete, drawVictory,
    triggerLevelUp, inBtn,
  };
})();
