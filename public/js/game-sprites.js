'use strict';

// ── Sprite system ─────────────────────────────────────────────────────────────
// Loads PNG sprite sheets and provides a draw helper.
// Falls back silently when an image isn't loaded (programmatic drawing takes over).
//
// Expected assets in public/assets/ (Pixel Adventure 1 by Pixel Frog, free):
//   ninja-idle.png   — 32×32 × 11 frames (horizontal strip)
//   ninja-run.png    — 32×32 × 12 frames
//   ninja-jump.png   — 32×32 × 1  frame
//   ninja-fall.png   — 32×32 × 1  frame
//   ninja-attack.png — 32×32 × 3  frames  (or copy of idle if not available)
//   terrain.png      — 16×16 tile sheet (Pixel Adventure 1 → Terrain.png)
//                      Platform top-row tiles live in row 0 of that sheet.

const Sprites = (() => {
  const _imgs = {};   // name → HTMLImageElement
  const _ready = {}; // name → bool

  // Frame counts per animation strip
  const FRAMES = {
    'ninja-idle':   11,
    'ninja-run':    12,
    'ninja-jump':   1,
    'ninja-fall':   1,
    'ninja-attack': 3,
    'grunt-idle':   8,
    'grunt-run':    8,
    'archer-idle':  8,
    'terrain':      null,   // used differently (tile index)
  };

  // Load a single image; resolves immediately whether it succeeds or fails.
  function _load(name, src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { _imgs[name] = img; _ready[name] = true;  resolve(); };
      img.onerror = () => {                     _ready[name] = false; resolve(); }; // missing = fallback
      img.src = src;
    });
  }

  // Load all sprites. Always resolves (missing sprites just won't render).
  function load() {
    const base = 'assets/';
    return Promise.all([
      _load('ninja-idle',   base + 'ninja-idle.png'),
      _load('ninja-run',    base + 'ninja-run.png'),
      _load('ninja-jump',   base + 'ninja-jump.png'),
      _load('ninja-fall',   base + 'ninja-fall.png'),
      _load('ninja-attack', base + 'ninja-attack.png'),
      _load('terrain',      base + 'terrain.png'),
    ]);
  }

  // Is a sprite ready?
  function has(name) { return !!_ready[name]; }

  // Draw one frame from a horizontal strip.
  //   name      — sprite key
  //   frame     — frame index (0-based)
  //   frameW    — width of one frame in the source image (pixels)
  //   frameH    — height of one frame in the source image (pixels)
  //   x, y      — destination top-left in logical coords
  //   w, h      — destination size in logical coords
  //   flipX     — mirror horizontally
  function draw(ctx, name, frame, frameW, frameH, x, y, w, h, flipX = false) {
    const img = _imgs[name];
    if (!img) return false; // not loaded — caller should use fallback

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

  // Draw a terrain tile from a tile sheet.
  //   tileX, tileY — tile column/row in the sheet
  //   tileSize     — size of one tile in the source image (px)
  //   x, y, w, h   — destination rect
  function drawTile(ctx, tileX, tileY, tileSize, x, y, w, h) {
    const img = _imgs['terrain'];
    if (!img) return false;
    ctx.drawImage(img, tileX * tileSize, tileY * tileSize, tileSize, tileSize, x, y, w, h);
    return true;
  }

  return { load, has, draw, drawTile };
})();
