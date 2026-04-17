'use strict';

// ── Background generator ─────────────────────────────────────────────────────
const Background = (() => {
  let _theme = 0;
  // Offscreen canvas for static sky — rebuilt only when theme changes
  let _skyCanvas = null, _skyTheme = -1;
  // Offscreen canvases for pre-rendered parallax layers — rebuilt only on theme change
  let _mountainCanvas = null, _silCanvas = null, _layerTheme = -1;
  // Cached ground gradient — rebuilt only on theme change
  let _groundGrad = null, _groundGradTheme = -1;
  // Pre-rendered ground surface strip — rebuilt only on theme change.
  // Width = LUT_SIZE + C.W so a viewport-width blit never goes out of bounds even at the wrap point.
  let _groundCanvas = null, _groundTheme = -1;
  const _GROUND_STRIP_H = 30;  // px above/below GROUND_Y covered by the strip

  function _rebuildSky() {
    if (!_skyCanvas) {
      _skyCanvas = document.createElement('canvas');
      _skyCanvas.width = C.W; _skyCanvas.height = C.H;
    }
    const sc = _skyCanvas.getContext('2d');
    sc.clearRect(0, 0, C.W, C.H);
    // Duplicate sky-drawing logic onto offscreen canvas
    const t = _theme;
    let g;
    if (t === 1) {
      g = sc.createLinearGradient(0, 0, 0, C.H);
      g.addColorStop(0, '#0a0a1e'); g.addColorStop(0.6, '#1a1a3a'); g.addColorStop(1, '#2a1a1a');
    } else if (t === 2) {
      g = sc.createLinearGradient(0, 0, 0, C.H);
      g.addColorStop(0, '#1a0505'); g.addColorStop(0.5, '#3a0a0a'); g.addColorStop(1, '#1a0808');
    } else {
      g = sc.createLinearGradient(0, 0, 0, C.H);
      g.addColorStop(0, '#05051a'); g.addColorStop(0.5, '#0d0d28'); g.addColorStop(1, '#0a1020');
    }
    sc.fillStyle = g; sc.fillRect(0, 0, C.W, C.H);
    // Moon
    sc.fillStyle = t === 2 ? '#ff6020' : (t === 1 ? '#e0e8ff' : '#f0f0e8');
    sc.beginPath(); sc.arc(C.W * 0.82, C.H * 0.14, 28, 0, Math.PI * 2); sc.fill();
    sc.fillStyle = t === 2 ? '#3a0a0a' : (t === 1 ? '#0a0a1e' : '#05051a');
    sc.beginPath(); sc.arc(C.W * 0.82 + 8, C.H * 0.14 - 6, 22, 0, Math.PI * 2); sc.fill();
    // Stars
    sc.fillStyle = 'rgba(255,255,255,0.65)';
    const seed = [0.12,0.34,0.56,0.78,0.23,0.45,0.67,0.89,0.11,0.33,0.55,0.77,0.19,0.41,0.63,0.85];
    for (let i = 0; i < 16; i++) {
      sc.beginPath();
      sc.arc(seed[i]*C.W, seed[(i+3)%16]*C.H*0.55, seed[(i+7)%16]*1.2+0.4, 0, Math.PI*2);
      sc.fill();
    }
    _skyTheme = t;
  }

  // Pre-renders mountains and silhouettes for the current theme onto offscreen canvases.
  // Each frame we then blit a viewport-sized slice — O(1) instead of O(n paths).
  const _LAYER_MW = C.W + 900;   // mountain canvas width: covers camX * 0.15 up to ~875 + C.W
  const _LAYER_SW = C.W + 2300;  // silhouette canvas width: covers camX * 0.40 up to ~2200 + C.W

  function _rebuildLayers() {
    const t = _theme;

    // ── Mountain layer ────────────────────────────────────────────────────────
    if (!_mountainCanvas) {
      _mountainCanvas = document.createElement('canvas');
      _mountainCanvas.width = _LAYER_MW;
      _mountainCanvas.height = C.H;
    }
    const mc = _mountainCanvas.getContext('2d');
    mc.clearRect(0, 0, _LAYER_MW, C.H);
    mc.fillStyle = t === 1 ? '#252535' : t === 2 ? '#2a1010' : '#1b1b38';
    mountains.forEach(m => {
      if (m.cx + m.w / 2 > 0 && m.cx - m.w / 2 < _LAYER_MW) drawMountain(mc, m);
    });
    if (t === 1) {
      mc.fillStyle = 'rgba(220,230,255,0.55)';
      mountains.forEach(m => {
        if (m.cx + m.w / 2 > 0 && m.cx - m.w / 2 < _LAYER_MW && m.h > 100) {
          const sh = m.h * 0.25;
          mc.beginPath();
          mc.moveTo(m.cx - m.w * 0.25, C.GROUND_Y - m.h + sh);
          mc.lineTo(m.cx, C.GROUND_Y - m.h);
          mc.lineTo(m.cx + m.w * 0.25, C.GROUND_Y - m.h + sh);
          mc.closePath(); mc.fill();
        }
      });
    }

    // ── Silhouette layer ──────────────────────────────────────────────────────
    if (!_silCanvas) {
      _silCanvas = document.createElement('canvas');
      _silCanvas.width = _LAYER_SW;
      _silCanvas.height = C.H;
    }
    const sc = _silCanvas.getContext('2d');
    sc.clearRect(0, 0, _LAYER_SW, C.H);
    if (t === 1) {
      sc.fillStyle = '#151525';
      rocks.forEach(r => { if (r.x + r.w / 2 > 0 && r.x - r.w / 2 < _LAYER_SW) drawRock(sc, r); });
    } else if (t === 2) {
      sc.fillStyle = '#150808';
      temples.forEach(tmpl => {
        if (tmpl.x + 100 > 0 && tmpl.x - 10 < _LAYER_SW) {
          if (tmpl.type === 'tower') drawTower(sc, tmpl); else drawWall(sc, tmpl);
        }
      });
      sc.fillStyle = 'rgba(255,120,0,0.7)';
      temples.forEach(tmpl => {
        if (tmpl.type === 'tower' && tmpl.x + 100 > 0 && tmpl.x < _LAYER_SW) {
          sc.beginPath(); sc.arc(tmpl.x, C.GROUND_Y - tmpl.h - 22, 4, 0, Math.PI * 2); sc.fill();
        }
      });
    } else {
      sc.fillStyle = '#0d0d1a';
      silhouettes.forEach(s => {
        if (s.x + 80 > 0 && s.x - 80 < _LAYER_SW) {
          s.type === 'bamboo' ? drawBamboo(sc, s) : drawPagoda(sc, s);
        }
      });
    }

    _layerTheme = t;
  }

  function setTheme(t) { _theme = t; _skyTheme = -1; _layerTheme = -1; _groundGradTheme = -1; _groundTheme = -1; }

  const WORLD_W = 30000;

  // ── Pre-generate geometry ─────────────────────────────────────────────────
  function genMountains(count) {
    const peaks = [];
    const sp = WORLD_W / count;
    for (let i = 0; i < count; i++) {
      peaks.push({ cx: i*sp + Math.random()*sp*0.6, h: 80+Math.random()*160, w: 180+Math.random()*280 });
    }
    peaks.slice().forEach(p => peaks.push({ cx: p.cx + WORLD_W, h: p.h, w: p.w }));
    return peaks;
  }

  function genSilhouettes(count) {
    const items = [];
    const sp = WORLD_W / count;
    for (let i = 0; i < count; i++) {
      const x = i*sp + Math.random()*sp*0.8;
      items.push(Math.random() > 0.38
        ? { type:'pagoda',  x, h: 70+Math.random()*55 }
        : { type:'bamboo',  x, h: 65+Math.random()*70, stems: 2+Math.floor(Math.random()*3) });
    }
    items.slice().forEach(p => items.push({ ...p, x: p.x + WORLD_W }));
    return items;
  }

  function genRocks(count) {
    const rocks = [];
    const sp = WORLD_W / count;
    for (let i = 0; i < count; i++) {
      const x = i*sp + Math.random()*sp*0.8;
      rocks.push({ x, w: 40+Math.random()*80, h: 30+Math.random()*60, type: Math.random()>0.5?'peak':'round' });
    }
    rocks.slice().forEach(r => rocks.push({ ...r, x: r.x + WORLD_W }));
    return rocks;
  }

  function genTemple(count) {
    const items = [];
    const sp = WORLD_W / count;
    for (let i = 0; i < count; i++) {
      const x = i*sp + Math.random()*sp*0.8;
      items.push({ type: Math.random()>0.4 ? 'tower' : 'wall', x, h: 80+Math.random()*90 });
    }
    items.slice().forEach(p => items.push({ ...p, x: p.x + WORLD_W }));
    return items;
  }

  // Pre-computed ground bump LUT — replaces 3×Math.sin per call in tight draw loops
  const _BUMP_LUT_SIZE = 8192;  // power-of-2, covers camX up to ~7200 + C.W
  const _BUMP_LUT = new Float32Array(_BUMP_LUT_SIZE);
  for (let i = 0; i < _BUMP_LUT_SIZE; i++) {
    _BUMP_LUT[i] = Math.sin(i * 0.031) * 3 + Math.sin(i * 0.071) * 2 + Math.sin(i * 0.018) * 4;
  }
  function groundBump(worldX) {
    return _BUMP_LUT[(worldX | 0) & (_BUMP_LUT_SIZE - 1)];
  }

  const mountains   = genMountains(60);
  const silhouettes = genSilhouettes(80);
  const rocks       = genRocks(70);
  const temples     = genTemple(60);

  // ── Shape helpers ─────────────────────────────────────────────────────────
  function drawMountain(ctx, m) {
    ctx.beginPath();
    ctx.moveTo(m.cx - m.w/2, C.GROUND_Y);
    ctx.lineTo(m.cx, C.GROUND_Y - m.h);
    ctx.lineTo(m.cx + m.w/2, C.GROUND_Y);
    ctx.closePath(); ctx.fill();
  }

  function drawBamboo(ctx, b) {
    const sw = 9;
    for (let s = 0; s < b.stems; s++) {
      const sx = b.x + s*(sw+6);
      ctx.fillRect(sx, C.GROUND_Y - b.h, sw, b.h);
      for (let n = 0; n < 4; n++) {
        const ny = C.GROUND_Y - (b.h*(n+1))/5;
        ctx.fillRect(sx-2, ny-1, sw+4, 2);
      }
      ctx.beginPath(); ctx.ellipse(sx+4, C.GROUND_Y-b.h-10, 18, 5, -0.4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx+4, C.GROUND_Y-b.h-8,  12, 4,  0.5, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawPagoda(ctx, p) {
    let tw=55, th=14, ty=C.GROUND_Y-8;
    for (let t=0; t<3; t++) {
      ty -= th+10;
      ctx.fillRect(p.x-tw/2, ty, tw, th);
      ctx.beginPath();
      ctx.moveTo(p.x-tw/2-8, ty);
      ctx.quadraticCurveTo(p.x, ty-12, p.x+tw/2+8, ty);
      ctx.lineTo(p.x+tw/2, ty);
      ctx.quadraticCurveTo(p.x, ty-7, p.x-tw/2, ty);
      ctx.closePath(); ctx.fill();
      tw-=14; th-=2;
    }
    ctx.fillRect(p.x-2, ty-18, 4, 18);
  }

  function drawRock(ctx, r) {
    ctx.beginPath();
    if (r.type === 'peak') {
      ctx.moveTo(r.x - r.w/2, C.GROUND_Y);
      ctx.lineTo(r.x,          C.GROUND_Y - r.h);
      ctx.lineTo(r.x + r.w/2,  C.GROUND_Y);
    } else {
      ctx.ellipse(r.x, C.GROUND_Y - r.h*0.5, r.w/2, r.h*0.55, 0, Math.PI, 0);
    }
    ctx.closePath(); ctx.fill();
  }

  function drawTower(ctx, t) {
    const bw = 36, base = C.GROUND_Y;
    ctx.fillRect(t.x - bw/2, base - t.h, bw, t.h);
    // Battlements
    ctx.fillRect(t.x - bw/2 - 4, base - t.h - 10, bw+8, 10);
    for (let i=0; i<4; i++) ctx.fillRect(t.x - bw/2 + i*12, base - t.h - 20, 7, 12);
    // Arrow slit
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(t.x-3, base - t.h*0.55, 6, 14);
  }

  function drawWall(ctx, t) {
    ctx.fillRect(t.x, C.GROUND_Y - t.h, 90, t.h);
    for (let i=0; i<4; i++) ctx.fillRect(t.x + i*24, C.GROUND_Y - t.h - 12, 14, 14);
  }

  // ── Ground strip pre-render ───────────────────────────────────────────────
  function _rebuildGround() {
    const t  = _theme;
    const W  = _BUMP_LUT_SIZE + C.W;   // 9152 — never goes out of bounds at wrap
    const SH = _GROUND_STRIP_H;
    const BY = 5;   // y=5 within the strip == C.GROUND_Y in world space

    if (!_groundCanvas) {
      _groundCanvas = document.createElement('canvas');
      _groundCanvas.width  = W;
      _groundCanvas.height = SH;
    }
    const gc = _groundCanvas.getContext('2d');
    gc.clearRect(0, 0, W, SH);

    // Bumpy surface fill
    const surfCol  = ['#3a5a20','#5a4a20','#3a2a10'][t];
    const edgeCol  = ['#7aba3a','#8a8a55','#883020'][t];
    gc.fillStyle = surfCol;
    gc.beginPath();
    gc.moveTo(0, SH);
    for (let wx = 0; wx < W; wx++) {
      gc.lineTo(wx, BY + 4 + _BUMP_LUT[wx & (_BUMP_LUT_SIZE - 1)]);
    }
    gc.lineTo(W, SH);
    gc.closePath();
    gc.fill();

    // Surface edge highlight
    gc.strokeStyle = edgeCol; gc.lineWidth = 2.5;
    gc.beginPath();
    for (let wx = 0; wx < W; wx++) {
      const b = _BUMP_LUT[wx & (_BUMP_LUT_SIZE - 1)];
      if (wx === 0) gc.moveTo(wx, BY + b); else gc.lineTo(wx, BY + b);
    }
    gc.stroke(); gc.lineWidth = 1;

    // Theme surface details
    if (t === 0) {
      gc.fillStyle = '#1e3010';
      for (let wx = 0; wx < W; wx += 38) {
        const b = _BUMP_LUT[wx & (_BUMP_LUT_SIZE - 1)];
        gc.fillRect(wx,    BY - 3 + b, 5, 3);
        gc.fillRect(wx+12, BY - 5 + b, 4, 5);
        gc.fillRect(wx+24, BY - 2 + b, 5, 2);
      }
    } else if (t === 1) {
      gc.fillStyle = '#4a4a5a';
      for (let wx = 0; wx < W; wx += 38) {
        const b = _BUMP_LUT[wx & (_BUMP_LUT_SIZE - 1)];
        gc.beginPath(); gc.ellipse(wx+4,  BY+3+b, 5, 3, 0,   0, Math.PI*2); gc.fill();
        gc.beginPath(); gc.ellipse(wx+20, BY+5+b, 7, 4, 0.3, 0, Math.PI*2); gc.fill();
        gc.beginPath(); gc.ellipse(wx+32, BY+2+b, 4, 3,-0.2, 0, Math.PI*2); gc.fill();
      }
    } else {
      gc.strokeStyle = 'rgba(0,0,0,0.4)'; gc.lineWidth = 1;
      for (let wx = 0; wx < W; wx += 50) {
        const b = _BUMP_LUT[wx & (_BUMP_LUT_SIZE - 1)];
        gc.beginPath(); gc.moveTo(wx, BY+b); gc.lineTo(wx, BY+12+b); gc.stroke();
      }
    }

    _groundTheme = t;
  }

  // ── Public draw functions ─────────────────────────────────────────────────
  function drawSky(ctx) {
    let gr;
    if (_theme === 1) {
      gr = ctx.createLinearGradient(0, 0, 0, C.H);
      gr.addColorStop(0,    '#0a0f1e');
      gr.addColorStop(0.5,  '#1a2a3a');
      gr.addColorStop(1,    '#2a3a1a');
    } else if (_theme === 2) {
      gr = ctx.createLinearGradient(0, 0, 0, C.H);
      gr.addColorStop(0,    '#0a0505');
      gr.addColorStop(0.55, '#1e0808');
      gr.addColorStop(1,    '#3a0e00');
    } else {
      gr = ctx.createLinearGradient(0, 0, 0, C.H);
      gr.addColorStop(0,    '#07071a');
      gr.addColorStop(0.55, '#12123a');
      gr.addColorStop(1,    '#2d1200');
    }
    ctx.fillStyle = gr; ctx.fillRect(0, 0, C.W, C.H);

    // Moon / sun-like light
    if (_theme === 2) {
      // Red moon
      ctx.fillStyle = 'rgba(200,60,20,0.7)';
      ctx.beginPath(); ctx.arc(C.W*0.83, 55, 28, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(200,80,20,0.18)'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(C.W*0.83, 55, 40, 0, Math.PI*2); ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255,255,220,0.88)';
      ctx.beginPath(); ctx.arc(C.W*0.83, 55, 26, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,200,0.12)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(C.W*0.83, 55, 36, 0, Math.PI*2); ctx.stroke();
    }
    ctx.lineWidth = 1;

    // Torch glow columns for temple theme
    if (_theme === 2) {
      for (let tx = 80; tx < C.W; tx += 160) {
        const g = ctx.createRadialGradient(tx, C.H*0.7, 0, tx, C.H*0.7, 80);
        g.addColorStop(0, 'rgba(255,120,0,0.18)');
        g.addColorStop(1, 'rgba(255,120,0,0)');
        ctx.fillStyle = g; ctx.fillRect(tx-80, C.H*0.4, 160, C.H*0.6);
      }
    }
  }

  function drawMountains(ctx, camX) {
    // Blit pre-rendered layer — one drawImage instead of O(n) vector paths
    ctx.drawImage(_mountainCanvas, camX * 0.15, 0, C.W, C.H, 0, 0, C.W, C.H);
  }

  function drawSilhouettes(ctx, camX) {
    // Blit pre-rendered layer — one drawImage instead of O(n) vector paths
    ctx.drawImage(_silCanvas, camX * 0.40, 0, C.W, C.H, 0, 0, C.W, C.H);
  }

  function drawGround(ctx, camX) {
    const theme = _theme;

    // Underground depth fill (gradient cached per theme — one fillRect)
    if (_groundGradTheme !== theme) {
      _groundGrad = ctx.createLinearGradient(0, C.GROUND_Y, 0, C.H);
      if (theme === 1) {
        _groundGrad.addColorStop(0,   '#2a2a2a');
        _groundGrad.addColorStop(0.3, '#1a1a1e');
        _groundGrad.addColorStop(1,   '#0e0e12');
      } else if (theme === 2) {
        _groundGrad.addColorStop(0,   '#1e0a0a');
        _groundGrad.addColorStop(0.3, '#140808');
        _groundGrad.addColorStop(1,   '#0a0404');
      } else {
        _groundGrad.addColorStop(0,   '#1a1a0a');
        _groundGrad.addColorStop(0.3, '#141408');
        _groundGrad.addColorStop(1,   '#0a0a04');
      }
      _groundGradTheme = theme;
    }
    ctx.fillStyle = _groundGrad;
    ctx.fillRect(0, C.GROUND_Y, C.W, C.H - C.GROUND_Y);

    // Bumpy surface strip — one drawImage from pre-rendered canvas (no per-frame paths/ellipses)
    if (_groundTheme !== theme) _rebuildGround();
    const srcX = (camX | 0) & (_BUMP_LUT_SIZE - 1);
    ctx.drawImage(_groundCanvas, srcX, 0, C.W, _GROUND_STRIP_H,
                  0, C.GROUND_Y - 5, C.W, _GROUND_STRIP_H);
  }

  // Unified call: uses bg image + ground when available, else programmatic with cached layers.
  function drawBackground(ctx, camX) {
    const bgName = `bg-level${_theme + 1}`;
    if (typeof Sprites !== 'undefined' && Sprites.has(bgName)) {
      Sprites.drawBg(ctx, bgName, camX);
    } else {
      if (_skyTheme !== _theme) _rebuildSky();
      if (_layerTheme !== _theme) _rebuildLayers();
      ctx.drawImage(_skyCanvas, 0, 0);
      drawMountains(ctx, camX);
      drawSilhouettes(ctx, camX);
    }
  }

  return { setTheme, drawBackground, drawSky, drawMountains, drawSilhouettes, drawGround };
})();
