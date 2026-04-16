'use strict';
// Canvas rendering — called every frame from editor-main.js

function eDrawSky(ctx, bgTheme) {
  const stops = E_SKY[bgTheme] || E_SKY[0];
  const g = ctx.createLinearGradient(0, 0, 0, ECANVAS_H);
  g.addColorStop(0, stops[0]); g.addColorStop(0.55, stops[1]); g.addColorStop(1, stops[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ECANVAS_W, ECANVAS_H);
}

function eDrawGround(ctx) {
  ctx.fillStyle = '#1a0e06';
  ctx.fillRect(0, EGROUND_Y, ECANVAS_W, ECANVAS_H - EGROUND_Y);
  ctx.fillStyle = '#3a1e0a';
  ctx.fillRect(0, EGROUND_Y, ECANVAS_W, 3);
}

function eDrawGrid(ctx, viewX, levelWidth) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.055)';
  ctx.lineWidth   = 0.5;
  const startX = Math.floor(viewX / EGRID) * EGRID;
  for (let x = startX; x < viewX + ECANVAS_W && x <= levelWidth; x += EGRID) {
    const sx = x - viewX;
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, ECANVAS_H); ctx.stroke();
  }
  for (let y = 0; y <= ECANVAS_H; y += EGRID) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ECANVAS_W, y); ctx.stroke();
  }
  // Level-end marker
  const ex = levelWidth - viewX;
  if (ex >= 0 && ex <= ECANVAS_W + 4) {
    ctx.strokeStyle = 'rgba(230,57,70,0.7)'; ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(ex, 0); ctx.lineTo(ex, ECANVAS_H); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function eDrawPlatform(ctx, p, viewX, selected) {
  const sx = p.x - viewX;
  if (sx + p.w < -20 || sx > ECANVAS_W + 20) return;
  const c = E_COLORS.platform;
  ctx.fillStyle = c.body; ctx.fillRect(sx, p.y, p.w, EPLAT_H);
  ctx.fillStyle = c.top;  ctx.fillRect(sx, p.y, p.w, 3);
  if (selected) {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.strokeRect(sx - 1, p.y - 1, p.w + 2, EPLAT_H + 2);
  }
}

function eDrawEnemy(ctx, e, viewX, selected) {
  const sx = e.x - viewX;
  if (sx < -40 || sx > ECANVAS_W + 40) return;
  const col = E_COLORS[e.type] || '#888';
  const W = 28, H = 48;
  ctx.fillStyle = col;
  ctx.fillRect(sx - W / 2, e.y, W, H);
  // Head dot
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(sx, e.y + 8, 5, 0, Math.PI * 2); ctx.fill();
  // Ground range indicator
  if (e.ground) {
    ctx.strokeStyle = 'rgba(255,80,80,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    const r = (e.range || 200) / 2;
    ctx.strokeRect(e.x - r - viewX, EGROUND_Y - 2, e.range || 200, 4);
    ctx.setLineDash([]);
  }
  if (selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(sx - W/2 - 2, e.y - 2, W + 4, H + 4); }
  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(e.ground ? 'GND' : e.type === 'archer' ? 'ARC' : 'GRN', sx, e.y - 2);
}

function eDrawBoss(ctx, boss, viewX, selected) {
  if (!boss) return;
  const sx = boss.x - viewX;
  if (sx < -60 || sx > ECANVAS_W + 60) return;
  const W = 50, H = 72;
  ctx.fillStyle = E_COLORS.boss;
  ctx.fillRect(sx - W / 2, boss.y, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('BOSS', sx, boss.y + H / 2 + 4);
  if (selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(sx - W/2 - 2, boss.y - 2, W + 4, H + 4); }
}

function eDrawCoin(ctx, c, viewX, selected) {
  const sx = c.x - viewX;
  if (sx < -20 || sx > ECANVAS_W + 20) return;
  ctx.fillStyle = E_COLORS.coin;
  ctx.beginPath(); ctx.arc(sx, c.y, 7, 0, Math.PI * 2); ctx.fill();
  if (selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, c.y, 9, 0, Math.PI * 2); ctx.stroke(); }
}

function eDrawPickup(ctx, p, viewX, selected) {
  const sx = p.x - viewX;
  if (sx < -20 || sx > ECANVAS_W + 20) return;
  const col = E_COLORS['pickup-' + p.type] || E_COLORS[p.type] || '#888';
  ctx.fillStyle = col;
  ctx.save(); ctx.translate(sx, p.y); ctx.rotate(Math.PI / 4);
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(p.type.slice(0, 3).toUpperCase(), sx, p.y + 16);
  if (selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(sx - 11, p.y - 11, 22, 22); }
}

function eDrawDragPreview(ctx, drag, viewX) {
  if (!drag || drag.type !== 'create-platform') return;
  const x1 = Math.min(drag.x1, drag.x2) - viewX;
  const w  = Math.abs(drag.x2 - drag.x1);
  if (w < 4) return;
  ctx.fillStyle  = 'rgba(109,170,48,0.45)';
  ctx.strokeStyle = 'rgba(138,186,58,0.9)'; ctx.lineWidth = 2;
  ctx.fillRect(x1, drag.y1, w, EPLAT_H);
  ctx.strokeRect(x1, drag.y1, w, EPLAT_H);
}

function eDrawCursor(ctx, mouse, tool, viewX) {
  const sx = mouse.x - viewX;
  if (sx < 0 || sx > ECANVAS_W) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(sx, 0);       ctx.lineTo(sx, ECANVAS_H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, mouse.y);  ctx.lineTo(ECANVAS_W, mouse.y); ctx.stroke();
  ctx.setLineDash([]);
}

function eRender(ctx) {
  const ld = eCurrent(); if (!ld) return;
  ctx.clearRect(0, 0, ECANVAS_W, ECANVAS_H);
  eDrawSky(ctx, ld.bgTheme);
  eDrawGround(ctx);
  eDrawGrid(ctx, ES.viewX, ld.width);

  ctx.save(); ctx.textBaseline = 'top';
  for (let i = 0; i < ld.platforms.length; i++)
    eDrawPlatform(ctx, ld.platforms[i], ES.viewX, ES.selected?.col === 'platforms' && ES.selected.idx === i);
  for (let i = 0; i < ld.coins.length; i++)
    eDrawCoin(ctx, ld.coins[i], ES.viewX, ES.selected?.col === 'coins' && ES.selected.idx === i);
  for (let i = 0; i < ld.pickups.length; i++)
    eDrawPickup(ctx, ld.pickups[i], ES.viewX, ES.selected?.col === 'pickups' && ES.selected.idx === i);
  for (let i = 0; i < ld.enemies.length; i++)
    eDrawEnemy(ctx, ld.enemies[i], ES.viewX, ES.selected?.col === 'enemies' && ES.selected.idx === i);
  eDrawBoss(ctx, ld.boss, ES.viewX, ES.selected?.col === 'boss');
  ctx.restore();

  eDrawDragPreview(ctx, ES.drag, ES.viewX);
  eDrawCursor(ctx, ES.mouse, ES.tool, ES.viewX);
}
