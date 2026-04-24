'use strict';
// Shared mutable state — imported by all editor modules via script order in HTML

const ES = {
  levelIdx: 0,
  levels:   [],       // EditorLevelData[]
  viewX:    0,
  tool:     'select',
  selected: null,     // { col: string, idx: number } | null
  drag:     null,     // active drag descriptor | null
  mouse:    { x: 0, y: 0 },   // world coords of last mouse position
  adminKey: sessionStorage.getItem('editorAdminKey') || '',
};

// ── Accessors ─────────────────────────────────────────────────────────────────
function eCurrent()       { return ES.levels[ES.levelIdx]; }
function eSnap(v)         { return Math.round(v / EGRID) * EGRID; }
function eClampView(x)    {
  const ld = eCurrent();
  return ld ? Math.max(0, Math.min(ld.width - ECANVAS_W, x)) : 0;
}

// ── Screen ↔ world ────────────────────────────────────────────────────────────
function eScreenToWorld(sx, sy) {
  return { x: sx + ES.viewX, y: sy };
}

// ── Convert any level format → unified flat editor format ─────────────────────
function eToFlat(ld) {
  const platforms = (ld.platforms || []).map(p => ({ x: p.x, y: p.y, w: p.w }));
  const enemies   = [];

  for (const e of (ld.enemies || [])) {
    if ('platIdx' in e) {
      const p = ld.platforms[e.platIdx];
      if (!p) continue;
      enemies.push({ type: e.type, x: Math.round(p.x + p.w * 0.35), y: p.y - 48, ground: false, range: 160 });
    } else {
      enemies.push({ ...e });
    }
  }
  for (const e of (ld.groundEnemies || [])) {
    enemies.push({ type: 'grunt', x: e.x, y: EGROUND_Y - 48, ground: true, range: e.range });
  }

  return {
    name:           ld.name           || 'NYTT LEVEL',
    bgTheme:        ld.bgTheme        ?? 0,
    width:          ld.width          || 3700,
    enemySpeedBase: ld.enemySpeedBase || 55,
    archerInterval: ld.archerInterval || 3.8,
    platforms,
    enemies,
    coins:        [],
    hidingSpots:  (ld.hidingSpots || []).map(h => ({ type: h.type, x: h.x, y: h.y, rotation: h.rotation || 0 })),
    pickups:      (ld.pickups || []).map(p => ({ type: p.type, x: p.x, y: p.y })),
    ladders:      (ld.ladders || []).map(l => ({ x: l.x, y: l.y, w: l.w || 24, h: l.h || 96, rotation: l.rotation || 0 })),
    spikes:       (ld.spikes  || []).map(s => ({ x: s.x, y: s.y, rotation: s.rotation !== undefined ? s.rotation : 180 })),
    boss: ld.boss ? { x: ld.boss.x, y: ld.boss.y, hp: ld.boss.hp || 8, type: ld.boss.type || 'samurai' } : null,
  };
}

// ── Init levels from C.LEVEL_DATA ────────────────────────────────────────────
function eInitLevels() {
  ES.levels = C.LEVEL_DATA.map(eToFlat);
}

// ── Merge a DB row into ES.levels ─────────────────────────────────────────────
function eMergeDbRow(row) {
  const idx  = row.idx;
  const flat = eToFlat(row.data);
  while (ES.levels.length <= idx) ES.levels.push(eToFlat({ name: 'LEVEL ' + (ES.levels.length + 1) }));
  ES.levels[idx] = flat;
}
