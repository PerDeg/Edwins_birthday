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
//
// Coin sprites (place in public/assets/rewards/):
//   gold.png, silver.png, copper.png  — horizontal sprite strips (square frames)

const Sprites = (() => {
  const _imgs  = {};   // name → HTMLImageElement
  const _ready = {};   // name → bool

  // For known sprite sheets: name → frame count (null = auto-detect from image width/height)
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
    'coin-gold':    null,   // auto-detect: frameCount = naturalWidth / naturalHeight
    'coin-silver':  null,
    'coin-copper':  null,
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
    const base  = 'assets/';
    const coins = 'assets/rewards/';
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
      _load('coin-gold',    coins + 'gold.png'),
      _load('coin-silver',  coins + 'silver.png'),
      _load('coin-copper',  coins + 'copper.png'),
    ]);
  }

  function has(name) { return !!_ready[name]; }

  // Returns frame count for a loaded sprite (auto-detects for coin strips).
  function frameCount(name) {
    const img = _imgs[name];
    if (!img) return 1;
    const fixed = FRAMES[name];
    if (fixed !== null && fixed !== undefined) return fixed;
    // Auto-detect: strip of square frames → count = width / height
    return Math.max(1, Math.round(img.naturalWidth / img.naturalHeight));
  }

  // Draw one frame from a horizontal sprite strip.
  function draw(ctx, name, frame, frameW, frameH, x, y, w, h, flipX = false) {
    const img = _imgs[name];
    if (!img) return false;
    const total = frameCount(name);
    const fw    = frameW || img.naturalHeight;  // default square frame
    const fh    = frameH || img.naturalHeight;
    const f     = Math.floor(frame) % total;
    ctx.save();
    if (flipX) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, f * fw, 0, fw, fh, 0, 0, w, h);
    } else {
      ctx.drawImage(img, f * fw, 0, fw, fh, x, y, w, h);
    }
    ctx.restore();
    return true;
  }

  // Draw a coin sprite frame (auto-sized square frames).
  function drawCoin(ctx, name, frame, x, y, size) {
    const img = _imgs[name];
    if (!img) return false;
    const total = frameCount(name);
    const fw    = img.naturalHeight;  // square frame
    const f     = Math.floor(frame) % total;
    ctx.drawImage(img, f * fw, 0, fw, fw, x, y, size, size);
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
  // The image is scaled to fill C.H and panned horizontally at ~5% of camera x.
  function drawBg(ctx, name, camX) {
    const img = _imgs[name];
    if (!img) return false;
    const sc      = C.H / img.naturalHeight;
    const scaledW = img.naturalWidth * sc;
    const maxOff  = Math.max(0, scaledW - C.W);
    const offset  = Math.min(maxOff, camX * 0.05);
    ctx.drawImage(img, -offset, 0, scaledW, C.H);
    return true;
  }

  return { load, has, draw, drawCoin, drawTile, drawBg, frameCount };
})();
