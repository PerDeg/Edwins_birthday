'use strict';
// Mouse / keyboard event handlers, hit-testing, item placement

// ── Hit testing ───────────────────────────────────────────────────────────────
function eHitTest(wx, wy) {
  const ld = eCurrent(); if (!ld) return null;

  // Platforms (largest — test last so small items on top win)
  for (let i = ld.platforms.length - 1; i >= 0; i--) {
    const p = ld.platforms[i];
    if (wx >= p.x - 4 && wx <= p.x + p.w + 4 && wy >= p.y - 4 && wy <= p.y + EPLAT_H + 8)
      return { col: 'platforms', idx: i };
  }
  // Boss
  if (ld.boss && Math.abs(wx - ld.boss.x) < 32 && wy >= ld.boss.y && wy <= ld.boss.y + 72)
    return { col: 'boss', idx: 0 };
  // Enemies
  for (let i = ld.enemies.length - 1; i >= 0; i--) {
    const e = ld.enemies[i];
    if (Math.abs(wx - e.x) < 20 && wy >= e.y && wy <= e.y + 48)
      return { col: 'enemies', idx: i };
  }
  // Pickups
  for (let i = ld.pickups.length - 1; i >= 0; i--) {
    const p = ld.pickups[i];
    if (Math.abs(wx - p.x) < 14 && Math.abs(wy - p.y) < 14)
      return { col: 'pickups', idx: i };
  }
  // Hiding spots
  for (let i = (ld.hidingSpots || []).length - 1; i >= 0; i--) {
    const h = ld.hidingSpots[i];
    const W = h.type === 'barrel' ? 28 : 42;
    const H = h.type === 'barrel' ? 34 : 12;
    if (wx >= h.x - 4 && wx <= h.x + W + 4 && wy >= h.y - 4 && wy <= h.y + H + 4)
      return { col: 'hidingSpots', idx: i };
  }
  return null;
}

// ── Item getters/setters for drag-move ────────────────────────────────────────
function eGetXY(sel) {
  const ld = eCurrent(); if (!ld || !sel) return { x: 0, y: 0 };
  if (sel.col === 'platforms')   return { x: ld.platforms[sel.idx].x,           y: ld.platforms[sel.idx].y };
  if (sel.col === 'enemies')     return { x: ld.enemies[sel.idx].x,             y: ld.enemies[sel.idx].y };
  if (sel.col === 'pickups')     return { x: ld.pickups[sel.idx].x,             y: ld.pickups[sel.idx].y };
  if (sel.col === 'hidingSpots') return { x: ld.hidingSpots[sel.idx].x,         y: ld.hidingSpots[sel.idx].y };
  if (sel.col === 'boss')        return { x: ld.boss.x,                          y: ld.boss.y };
  return { x: 0, y: 0 };
}

function eSetXY(sel, x, y) {
  const ld = eCurrent(); if (!ld || !sel) return;
  if (sel.col === 'platforms')       { ld.platforms[sel.idx].x = x;   ld.platforms[sel.idx].y = y; }
  else if (sel.col === 'enemies')    { ld.enemies[sel.idx].x = x;     ld.enemies[sel.idx].y = y; }
  else if (sel.col === 'pickups')    { ld.pickups[sel.idx].x = x;     ld.pickups[sel.idx].y = y; }
  else if (sel.col === 'hidingSpots'){ ld.hidingSpots[sel.idx].x = x; ld.hidingSpots[sel.idx].y = y; }
  else if (sel.col === 'boss')       { ld.boss.x = x; ld.boss.y = y; }
}

// ── Placement ─────────────────────────────────────────────────────────────────
function ePlace(tool, wx, wy) {
  const ld = eCurrent(); if (!ld) return;
  const sx = eSnap(wx), sy = eSnap(wy);

  if (tool === 'grunt' || tool === 'archer') {
    const plat = ld.platforms.find(p => wx >= p.x && wx <= p.x + p.w && Math.abs(sy - p.y) < 80);
    const ground = !plat && tool === 'grunt';
    if (tool === 'archer' && !plat) { eSetStatus('Bågskyt kräver en plattform!'); return; }
    const ey = plat ? plat.y - 48 : EGROUND_Y - 48;
    ld.enemies.push({ type: tool, x: sx, y: ey, ground, range: ground ? 200 : 160 });
  } else if (tool === 'boss') {
    ld.boss = { x: sx, y: sy, hp: ld.boss?.hp || 8, type: ld.boss?.type || 'samurai' };
    ES.selected = { col: 'boss', idx: 0 };
    eRenderProps();
  } else if (tool === 'hiding-barrel') {
    if (!ld.hidingSpots) ld.hidingSpots = [];
    ld.hidingSpots.push({ type: 'barrel', x: sx, y: sy });
  } else if (tool === 'hiding-shadow') {
    if (!ld.hidingSpots) ld.hidingSpots = [];
    ld.hidingSpots.push({ type: 'shadow', x: sx, y: sy });
  } else if (tool.startsWith('pickup-')) {
    ld.pickups.push({ type: tool.replace('pickup-', ''), x: sx, y: sy });
  }
  eUpdateCounts();
}

// ── Delete selected ───────────────────────────────────────────────────────────
function eDeleteSelected() {
  const ld = eCurrent(); if (!ld || !ES.selected) return;
  const { col, idx } = ES.selected;
  if (col === 'platforms')       ld.platforms.splice(idx, 1);
  else if (col === 'enemies')    ld.enemies.splice(idx, 1);
  else if (col === 'pickups')    ld.pickups.splice(idx, 1);
  else if (col === 'hidingSpots') (ld.hidingSpots || []).splice(idx, 1);
  else if (col === 'boss')       ld.boss = null;
  ES.selected = null;
  eRenderProps();
  eUpdateCounts();
}

// ── Mouse event handlers ──────────────────────────────────────────────────────
function eOnMouseDown(e) {
  const rect = e.target.getBoundingClientRect();
  const sx = (e.clientX - rect.left), sy = (e.clientY - rect.top);
  const { x: wx, y: wy } = eScreenToWorld(sx, sy);
  ES.mouse = { x: wx, y: wy };

  if (ES.tool === 'select' || ES.tool === 'eraser') {
    const hit = eHitTest(wx, wy);
    if (hit) {
      if (ES.tool === 'eraser') {
        ES.selected = hit; eDeleteSelected(); return;
      }
      ES.selected = hit;
      const orig = eGetXY(hit);
      ES.drag = { type: 'move', startWX: wx, startWY: wy, origX: orig.x, origY: orig.y };
      eRenderProps();
    } else {
      ES.selected = null;
      ES.drag = { type: 'scroll', startSX: e.clientX, startViewX: ES.viewX };
      eRenderProps();
    }
  } else if (ES.tool === 'platform') {
    const sx2 = eSnap(wx), sy2 = eSnap(wy);
    ES.drag = { type: 'create-platform', x1: sx2, y1: sy2, x2: sx2, y2: sy2 };
  } else {
    ePlace(ES.tool, wx, wy);
  }
}

function eOnMouseMove(e) {
  const rect = e.target.getBoundingClientRect();
  const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
  const { x: wx, y: wy } = eScreenToWorld(sx, sy);
  ES.mouse = { x: wx, y: wy };

  document.getElementById('coord-label').textContent =
    `x: ${Math.round(wx)}  y: ${Math.round(wy)}`;

  if (!ES.drag) return;

  if (ES.drag.type === 'create-platform') {
    ES.drag.x2 = eSnap(wx); ES.drag.y2 = eSnap(wy);
  } else if (ES.drag.type === 'move') {
    const dx = eSnap(wx) - eSnap(ES.drag.startWX);
    const dy = eSnap(wy) - eSnap(ES.drag.startWY);
    eSetXY(ES.selected, ES.drag.origX + dx, ES.drag.origY + dy);
    eRenderProps();
  } else if (ES.drag.type === 'scroll') {
    ES.viewX = eClampView(ES.drag.startViewX - (e.clientX - ES.drag.startSX));
    eSyncScrollbar();
  }
}

function eOnMouseUp(e) {
  if (ES.drag?.type === 'create-platform') {
    const { x1, y1, x2, y2 } = ES.drag;
    const px = Math.min(x1, x2), pw = Math.abs(x2 - x1);
    const py = eSnap(Math.min(y1, y2));
    if (pw >= EGRID) { eCurrent().platforms.push({ x: px, y: py, w: pw }); eUpdateCounts(); }
  }
  ES.drag = null;
}

function eOnKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); eDeleteSelected(); }
  if (e.key === 'ArrowLeft')  { ES.viewX = eClampView(ES.viewX - EGRID * 3); eSyncScrollbar(); }
  if (e.key === 'ArrowRight') { ES.viewX = eClampView(ES.viewX + EGRID * 3); eSyncScrollbar(); }
}
