'use strict';

// ── Sprite system ─────────────────────────────────────────────────────────────
// Loads PNG sprite sheets AND individual-frame PNG sequences.
// Falls back silently when images aren't loaded (programmatic drawing takes over).
//
// Ninja character (individual frame sequences in assets/ninja/):
//   01-Idle/MN_NINJA_Idle_000..011      (12 frames)
//   02-Run/MN_NINJA_Run_000..009        (10 frames)
//   03-Attack/01-Attack1/MN_NINJA_Attack1_000..007  (8 frames)
//   03-Attack/02-Attack2/MN_NINJA_Attack2_000..007  (8 frames)
//   04-Jump/01-JumpUp/MN_NINJA_JumpUp_000..004      (5 frames)
//   04-Jump/02-JumpFall/MN_NINJA_JumpFall_000..004  (5 frames)
//   05-Hurt/MN_NINJA_Hurt_000..005      (6 frames)
//   06-Dead/MN_NINJA_Dead_000..007      (8 frames)
//
// Weapon sprites (single images in assets/weapon/):
//   Shuriken.png, Kunai.png
//
// Level backgrounds (place in public/assets/):
//   bg-level1.png, bg-level2.png, bg-level3.png
//
// Coin sprites (place in public/assets/rewards/):
//   gold.png, silver.png, copper.png  — horizontal or vertical sprite strips

const Sprites = (() => {
  const _imgs     = {};   // name → HTMLImageElement  (sprite sheets & single images)
  const _ready    = {};   // name → bool
  const _seqs     = {};   // name → HTMLImageElement[]  (individual-frame sequences)
  const _seqReady = {};   // name → bool

  // ── Single image loader ───────────────────────────────────────────────────
  function _load(name, src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { _imgs[name] = img; _ready[name] = true;  resolve(); };
      img.onerror = () => {                     _ready[name] = false; resolve(); };
      img.src = src;
    });
  }

  // ── Sequence loader ───────────────────────────────────────────────────────
  // Loads an array of individual PNG paths as one named sequence.
  function _loadSeq(name, urls) {
    _seqs[name] = new Array(urls.length).fill(null);
    _seqReady[name] = false;
    const promises = urls.map((src, i) => new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { _seqs[name][i] = img; resolve(); };
      img.onerror = () => { resolve(); };   // null slot for missing frames
      img.src = src;
    }));
    return Promise.all(promises).then(() => {
      _seqReady[name] = !!_seqs[name][0];  // ready if at least frame 0 loaded
    });
  }

  // Build URL list for the ninja sequences.
  // e.g. _ninjaUrls('01-Idle', 'MN_NINJA_Idle_', 12) →
  //      ['assets/ninja/01-Idle/MN_NINJA_Idle_000.png', ..., 'MN_NINJA_Idle_011.png']
  function _ninjaUrls(subDir, prefix, count) {
    const urls = [];
    for (let i = 0; i < count; i++) {
      urls.push(`assets/ninja/${subDir}/${prefix}${String(i).padStart(3, '0')}.png`);
    }
    return urls;
  }

  // ── Load everything ───────────────────────────────────────────────────────
  function load() {
    const coins = 'assets/rewards/';
    const base  = 'assets/';

    const seqJobs = [
      _loadSeq('ninja-idle',      _ninjaUrls('01-Idle',              'MN_NINJA_Idle_',    12)),
      _loadSeq('ninja-run',       _ninjaUrls('02-Run',               'MN_NINJA_Run_',     10)),
      _loadSeq('ninja-attack1',   _ninjaUrls('03-Attack/01-Attack1', 'MN_NINJA_Attack1_',  8)),
      _loadSeq('ninja-attack2',   _ninjaUrls('03-Attack/02-Attack2', 'MN_NINJA_Attack2_',  8)),
      _loadSeq('ninja-jumpup',    _ninjaUrls('04-Jump/01-JumpUp',    'MN_NINJA_JumpUp_',   5)),
      _loadSeq('ninja-jumpfall',  _ninjaUrls('04-Jump/02-JumpFall',  'MN_NINJA_JumpFall_', 5)),
      _loadSeq('ninja-hurt',      _ninjaUrls('05-Hurt',              'MN_NINJA_Hurt_',     6)),
      _loadSeq('ninja-dead',      _ninjaUrls('06-Dead',              'MN_NINJA_Dead_',     8)),
    ];

    const imgJobs = [
      _load('weapon-shuriken', base + 'weapon/Shuriken.png'),
      _load('weapon-kunai',    base + 'weapon/Kunai.png'),
      _load('heart',           base + 'other/heart.png'),
      _load('gem',             base + 'other/gem.png'),
      _load('prop-box',        base + 'other/box.png'),
      _load('prop-ladder',     base + 'other/ladder.png'),
      _load('prop-spike',      base + 'other/spike.png'),
      _load('terrain',         base + 'terrain.png'),
      _load('bg-level1',       base + 'bg-level1.png'),
      _load('bg-level2',       base + 'bg-level2.png'),
      _load('bg-level3',       base + 'bg-level3.png'),
      _load('coin-gold',       coins + 'gold.png'),
      _load('coin-silver',     coins + 'silver.png'),
      _load('coin-copper',     coins + 'copper.png'),
    ];

    return Promise.all([...seqJobs, ...imgJobs]);
  }

  // ── Queries ───────────────────────────────────────────────────────────────
  function has(name)    { return !!_ready[name]; }
  function hasSeq(name) { return !!_seqReady[name]; }

  // ── Draw helpers ──────────────────────────────────────────────────────────

  // Draw one frame from an individual-frame sequence.
  function drawSeq(ctx, name, frame, x, y, w, h, flipX = false) {
    const seq = _seqs[name];
    if (!seq || !seq.length) return false;
    const total = seq.length;
    const f   = Math.floor(frame) % total;
    const img = seq[f] || seq[0];
    if (!img) return false;
    ctx.save();
    if (flipX) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.restore();
    return true;
  }

  // Draw one frame from a horizontal sprite sheet strip.
  function draw(ctx, name, frame, frameW, frameH, x, y, w, h, flipX = false) {
    const img = _imgs[name];
    if (!img) return false;
    const fw = frameW || img.naturalHeight;
    const fh = frameH || img.naturalHeight;
    const total = Math.max(1, Math.round(img.naturalWidth / fw));
    const f  = Math.floor(frame) % total;
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

  // Draw a single image centered at (cx, cy) with a rotation angle.
  // Used for weapon sprites (shurikens spin, kunai points in travel direction).
  function drawRotated(ctx, name, cx, cy, w, h, angle) {
    const img = _imgs[name];
    if (!img) return false;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }

  // Draw a coin sprite frame.
  // Handles both horizontal strips (width ≥ height) and vertical strips (height > width).
  function drawCoin(ctx, name, frame, x, y, size) {
    const img = _imgs[name];
    if (!img) return false;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    let fw, fh, sx, sy, total;

    if (iw >= ih) {
      // Horizontal strip
      fw = fh = ih;
      total   = Math.max(1, Math.round(iw / ih));
      const f = Math.floor(frame) % total;
      sx = f * fw; sy = 0;
    } else {
      // Vertical strip
      fw = fh = iw;
      total   = Math.max(1, Math.round(ih / iw));
      const f = Math.floor(frame) % total;
      sx = 0; sy = f * fh;
    }

    ctx.drawImage(img, sx, sy, fw, fh, x, y, size, size);
    return true;
  }

  // Draw a terrain tile from a tile sheet.
  function drawTile(ctx, tileX, tileY, tileSize, x, y, w, h) {
    const img = _imgs['terrain'];
    if (!img) return false;
    ctx.drawImage(img, tileX * tileSize, tileY * tileSize, tileSize, tileSize, x, y, w, h);
    return true;
  }

  // Draw a full background image with slow parallax.
  // Scaled to fill C.H, panned horizontally at ~5% of camera x.
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

  // Draw a sprite tiled to fill w×h — preserves aspect ratio by repeating square tiles.
  // Used for objects like ladders where the logical size doesn't match the sprite aspect ratio.
  function drawTiled(ctx, name, x, y, w, h, angle) {
    const img = _imgs[name];
    if (!img) return false;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (angle) ctx.rotate(angle);
    ctx.translate(-w / 2, -h / 2);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    const ts = w;  // tile size = width (square tiles)
    const rows = Math.ceil(h / ts) + 1;
    for (let r = 0; r < rows; r++) {
      ctx.drawImage(img, 0, r * ts, ts, ts);
    }
    ctx.restore();
    return true;
  }

  return { load, has, hasSeq, draw, drawSeq, drawRotated, drawTiled, drawCoin, drawTile, drawBg };
})();
