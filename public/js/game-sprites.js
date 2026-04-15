'use strict';

// ── Sprite system ─────────────────────────────────────────────────────────────
// Loads PNG sprite sheets and provides draw helpers.
// Falls back silently when an image isn't loaded (programmatic drawing takes over).
//
// Character sprites (Pixel Adventure 1 by Pixel Frog):
//   ninja-idle.png   — 32×32 × 11 frames
//   ninja-run.png    — 32×32 × 12 frames
//   ninja-jump.png   — 32×32 × 1  frame
//   ninja-fall.png   — 32×32 × 1  frame
//   ninja-attack.png — 32×32 × 3  frames
//   terrain.png      — 16×16 tile sheet
//
// Level backgrounds (place in public/assets/):
//   bg-level1.png, bg-level2.png, bg-level3.png

const Sprites = (() => {
  const _imgs  = {};   // name → HTMLImageElement
  const _ready = {};   // name → bool

  const FRAMES = {
    'ninja-idle':   11,
    'ninja-run':    12,
    'ninja-jump':   1,
    'ninja-fall':   1,
    'ninja-attack': 3,
    'grunt-idle':   8,
    'grunt-run':    8,
    'archer-idle':  8,
    'terrain':      null,
  };

  function _load(name, src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { _imgs[name] = img; _ready[name] = true;  resolve(); };
      img.onerror = () => {                     _ready[name] = false; resolve(); };
      img.src = src;
    });
  }

  function load() {
    const base = 'assets/';
    return Promise.all([
      _load('ninja-idle',   base + 'ninja-idle.png'),
      _load('ninja-run',    base + 'ninja-run.png'),
      _load('ninja-jump',   base + 'ninja-jump.png'),
      _load('ninja-fall',   base + 'ninja-fall.png'),
      _load('ninja-attack', base + 'ninja-attack.png'),
      _load('terrain',      base + 'terrain.png'),
      _load('bg-level1',    base + 'bg-level1.png'),
      _load('bg-level2',    base + 'bg-level2.png'),
      _load('bg-level3',    base + 'bg-level3.png'),
    ]);
  }

  function has(name) { return !!_ready[name]; }

  // Draw one frame from a horizontal sprite strip.
  function draw(ctx, name, frame, frameW, frameH, x, y, w, h, flipX = false) {
    const img = _imgs[name];
    if (!img) return false;
    const totalFrames = FRAMES[name] || 1;
    const f = Math.floor(frame) % totalFrames;
    ctx.save();
    if (flipX) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, f * frameW, 0, frameW, frameH, 0, 0, w, h);
    } else {
      ctx.drawImage(img, f * frameW, 0, frameW, frameH, x, y, w, h);
    }
    ctx.restore();
    return true;
  }

  // Draw a terrain tile.
  function drawTile(ctx, tileX, tileY, tileSize, x, y, w, h) {
    const img = _imgs['terrain'];
    if (!img) return false;
    ctx.drawImage(img, tileX * tileSize, tileY * tileSize, tileSize, tileSize, x, y, w, h);
    return true;
  }

  // Draw a full background image with slow parallax.
  // The image is scaled to fill C.H and panned horizontally.
  function drawBg(ctx, name, camX) {
    const img = _imgs[name];
    if (!img) return false;
    const scale   = C.H / img.naturalHeight;
    const scaledW = img.naturalWidth * scale;
    const maxOff  = Math.max(0, scaledW - C.W);
    const offset  = Math.min(maxOff, camX * 0.06);
    ctx.drawImage(img, -offset, 0, scaledW, C.H);
    return true;
  }

  return { load, has, draw, drawTile, drawBg };
})();
