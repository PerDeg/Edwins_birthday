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
    ctx.fillText('NIVÅ KLAR!', C.W/2, C.H/2 - 80);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    ctx.font = 'bold 26px system-ui'; ctx.fillStyle = '#fff';
    ctx.fillText(levelName, C.W/2, C.H/2 - 36);

    // ── Rank badge ────────────────────────────────────────────────────────
    const rank = (typeof lastLevelRank !== 'undefined' && lastLevelRank) ? lastLevelRank : '';
    if (rank) {
      const rankColors = { S: '#ffd700', A: '#c8f060', B: '#88ccff', C: '#d0d0d0', D: '#888888' };
      const rCol = rankColors[rank] || '#aaa';
      ctx.save();
      ctx.shadowColor = rCol;
      ctx.shadowBlur  = 22 + Math.sin(lcAnim * 3) * 8;
      ctx.font = 'bold 68px system-ui'; ctx.fillStyle = rCol;
      ctx.fillText(rank, C.W / 2 - 110, C.H / 2 + 28);
      ctx.shadowBlur = 0;
      ctx.font = '11px system-ui';
      ctx.fillStyle = 'rgba(200,168,60,0.65)';
      ctx.fillText('RANK', C.W / 2 - 110, C.H / 2 + 42);
      ctx.restore();
    }

    // ── Level time ────────────────────────────────────────────────────────
    if (typeof levelTimer !== 'undefined' && levelTimer > 0) {
      const secs = Math.floor(levelTimer);
      const timeStr = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
      ctx.save();
      ctx.font = '22px system-ui'; ctx.fillStyle = C.COL_GOLD;
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, C.W / 2 + 90, C.H / 2 + 10);
      ctx.font = '11px system-ui'; ctx.fillStyle = 'rgba(200,168,60,0.65)';
      ctx.fillText('TID', C.W / 2 + 90, C.H / 2 + 26);
      ctx.restore();
    }

    if (!isLast) {
      ctx.font = '18px system-ui'; ctx.fillStyle = 'rgba(200,168,60,0.75)';
      ctx.fillText('Klicka eller tryck för att fortsätta →', C.W/2, C.H/2 + 76);
    }

    // Sparkling stars
    ctx.fillStyle = C.COL_GOLD;
    for (let i = 0; i < 5; i++) {
      const a = (i/5)*Math.PI*2 + lcAnim;
      const r = 120 + Math.sin(lcAnim*2 + i)*20;
      const sx = C.W/2 + Math.cos(a)*r, sy = C.H/2 - 36 + Math.sin(a)*r*0.4;
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

  // ── UPGRADE PICK ──────────────────────────────────────────────────────────
  function drawUpgradePick(ctx, dt, choices, mouse) {
    overlay(ctx, 0.88);
    ctx.textAlign = 'center';
    ctx.shadowColor = C.COL_GOLD; ctx.shadowBlur = 16;
    ctx.font = 'bold 36px system-ui'; ctx.fillStyle = C.COL_GOLD;
    ctx.fillText('VÄLJ EN UPPGRADERING', C.W/2, 88);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    ctx.font = '16px system-ui'; ctx.fillStyle = 'rgba(200,168,60,0.65)';
    ctx.fillText('Klicka på ett kort', C.W/2, 118);

    const cardW = 200, cardH = 270, cy = C.H/2 + 30;
    const xs = [C.W/2 - 240, C.W/2, C.W/2 + 240];

    choices.forEach((up, i) => {
      const cx = xs[i];
      const hov = mouse && inBtn(mouse, cx, cy, cardW, cardH);
      ctx.save();
      if (hov) ctx.scale(1 + 0.02 * (Math.sin(Date.now()*0.006) * 0.5 + 0.5), 1);

      ctx.fillStyle   = hov ? 'rgba(200,168,60,0.22)' : 'rgba(255,255,255,0.06)';
      ctx.strokeStyle = hov ? C.COL_GOLD : 'rgba(200,168,60,0.38)';
      ctx.lineWidth   = hov ? 2 : 1.5;
      ctx.beginPath(); ctx.roundRect(cx - cardW/2, cy - cardH/2, cardW, cardH, 8);
      ctx.fill(); ctx.stroke();

      ctx.font = '48px system-ui'; ctx.fillStyle = '#fff';
      ctx.fillText(up.icon, cx, cy - 72);
      ctx.font = 'bold 15px system-ui'; ctx.fillStyle = hov ? C.COL_GOLD : '#fff';
      ctx.fillText(up.name, cx, cy - 22);
      ctx.font = '13px system-ui'; ctx.fillStyle = 'rgba(220,220,220,0.85)';
      const words = up.desc.split(' ');
      let line = '', lineY = cy + 12;
      words.forEach(w => {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > cardW - 20) { ctx.fillText(line, cx, lineY); line = w; lineY += 20; }
        else line = test;
      });
      if (line) ctx.fillText(line, cx, lineY);
      ctx.restore();
    });
    ctx.textAlign = 'left';
  }

  // ── SURVIVAL OVER ─────────────────────────────────────────────────────────
  function drawSurvivalOver(ctx, score, wave, kills, board, mouse) {
    overlay(ctx, 0.88);
    ctx.textAlign = 'center';
    ctx.shadowColor = C.COL_RED; ctx.shadowBlur = 20;
    ctx.font = 'bold 48px system-ui'; ctx.fillStyle = C.COL_RED;
    ctx.fillText('SURVIVAL OVER', C.W/2, C.H/2 - 120);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    ctx.font = 'bold 24px system-ui'; ctx.fillStyle = C.COL_GOLD;
    ctx.fillText(`Poäng: ${score.toLocaleString('sv')}`, C.W/2, C.H/2 - 70);
    ctx.font = '16px system-ui'; ctx.fillStyle = '#ccc';
    ctx.fillText(`Våning ${wave}  ·  ${kills} fiender besegrade`, C.W/2, C.H/2 - 42);

    // Top 5 survival board inline
    if (board && board.length) {
      ctx.font = 'bold 12px system-ui'; ctx.fillStyle = 'rgba(200,168,60,0.6)';
      ctx.fillText('— SURVIVAL TOPPLISTA —', C.W/2, C.H/2 - 8);
      board.slice(0, 5).forEach((r, i) => {
        ctx.font = '13px system-ui'; ctx.fillStyle = i === 0 ? C.COL_GOLD : '#ccc';
        ctx.fillText(`${i+1}. ${r.name}  —  ${Number(r.score).toLocaleString('sv')}`, C.W/2, C.H/2 + 18 + i*22);
      });
    }

    button(ctx, 'SKICKA IN POÄNG', C.W/2, C.H/2 + 70, 230, 50, mouse && inBtn(mouse, C.W/2, C.H/2+70, 230, 50));
    button(ctx, 'TILLBAKA',         C.W/2, C.H/2 + 134, 180, 42, mouse && inBtn(mouse, C.W/2, C.H/2+134, 180, 42));
    ctx.textAlign = 'left';
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
    drawUpgradePick, drawSurvivalOver,
    triggerLevelUp, inBtn,
  };
})();
