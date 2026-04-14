'use strict';

// ── Background generator ─────────────────────────────────────────────────────
const Background = (() => {
  // Pre-generate mountain ranges seeded across a wide world
  const WORLD_W = 30000;

  function genMountains(count) {
    const peaks = [];
    const spacing = WORLD_W / count;
    for (let i = 0; i < count; i++) {
      const cx = i * spacing + Math.random() * spacing * 0.6;
      const h  = 80 + Math.random() * 160;
      const w  = 180 + Math.random() * 280;
      peaks.push({ cx, h, w });
    }
    // Tile a second copy far right
    const base = peaks.slice();
    base.forEach(p => peaks.push({ cx: p.cx + WORLD_W, h: p.h, w: p.w }));
    return peaks;
  }

  function genSilhouettes(count) {
    const items = [];
    const spacing = WORLD_W / count;
    for (let i = 0; i < count; i++) {
      const x = i * spacing + Math.random() * spacing * 0.8;
      items.push(Math.random() > 0.38
        ? { type: 'pagoda', x, h: 70 + Math.random() * 55 }
        : { type: 'bamboo', x, h: 65 + Math.random() * 70, stems: 2 + Math.floor(Math.random() * 3) });
    }
    const base = items.slice();
    base.forEach(p => items.push({ ...p, x: p.x + WORLD_W }));
    return items;
  }

  const mountains   = genMountains(60);
  const silhouettes = genSilhouettes(80);

  // ── Draw helpers ─────────────────────────────────────────────────────────
  function drawMountain(ctx, m) {
    ctx.beginPath();
    ctx.moveTo(m.cx - m.w / 2, C.GROUND_Y);
    ctx.lineTo(m.cx, C.GROUND_Y - m.h);
    ctx.lineTo(m.cx + m.w / 2, C.GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }

  function drawBamboo(ctx, b) {
    const stemW = 9;
    for (let s = 0; s < b.stems; s++) {
      const sx = b.x + s * (stemW + 6);
      ctx.fillRect(sx, C.GROUND_Y - b.h, stemW, b.h);
      // node lines
      for (let n = 0; n < 4; n++) {
        const ny = C.GROUND_Y - (b.h * (n + 1)) / 5;
        ctx.fillRect(sx - 2, ny - 1, stemW + 4, 2);
      }
      // leaves
      ctx.beginPath();
      ctx.ellipse(sx + 4, C.GROUND_Y - b.h - 10, 18, 5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sx + 4, C.GROUND_Y - b.h - 8, 12, 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPagoda(ctx, p) {
    const tiers = 3;
    let tw = 55, th = 14;
    let ty = C.GROUND_Y - 8;
    for (let t = 0; t < tiers; t++) {
      ty -= th + 10;
      ctx.fillRect(p.x - tw / 2, ty, tw, th);
      // curved roof overhang
      ctx.beginPath();
      ctx.moveTo(p.x - tw / 2 - 8, ty);
      ctx.quadraticCurveTo(p.x, ty - 12, p.x + tw / 2 + 8, ty);
      ctx.lineTo(p.x + tw / 2, ty);
      ctx.quadraticCurveTo(p.x, ty - 7, p.x - tw / 2, ty);
      ctx.closePath();
      ctx.fill();
      tw -= 14; th -= 2;
    }
    // spire
    ctx.fillRect(p.x - 2, ty - 18, 4, 18);
  }

  // ── Public draw ──────────────────────────────────────────────────────────
  function drawSky(ctx) {
    const gr = ctx.createLinearGradient(0, 0, 0, C.H);
    gr.addColorStop(0,    '#07071a');
    gr.addColorStop(0.55, '#12123a');
    gr.addColorStop(1,    '#2d1200');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, C.W, C.H);

    // Moon
    ctx.fillStyle = 'rgba(255,255,220,0.88)';
    ctx.beginPath();
    ctx.arc(C.W * 0.83, 55, 26, 0, Math.PI * 2);
    ctx.fill();
    // Halo
    ctx.strokeStyle = 'rgba(255,255,200,0.12)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(C.W * 0.83, 55, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function drawMountains(ctx, camX) {
    ctx.save();
    ctx.translate(-camX * 0.15, 0);
    ctx.fillStyle = '#1b1b38';
    const lo = camX * 0.15 - 100;
    const hi = lo + C.W + 200;
    mountains.forEach(m => { if (m.cx + m.w/2 > lo && m.cx - m.w/2 < hi) drawMountain(ctx, m); });
    ctx.restore();
  }

  function drawSilhouettes(ctx, camX) {
    ctx.save();
    ctx.translate(-camX * 0.40, 0);
    ctx.fillStyle = '#0d0d1a';
    const lo = camX * 0.40 - 100;
    const hi = lo + C.W + 200;
    silhouettes.forEach(s => {
      if (s.x + 80 > lo && s.x - 80 < hi) {
        s.type === 'bamboo' ? drawBamboo(ctx, s) : drawPagoda(ctx, s);
      }
    });
    ctx.restore();
  }

  function drawGround(ctx, camX) {
    // Ground strip
    ctx.fillStyle = '#1a1a0a';
    ctx.fillRect(0, C.GROUND_Y, C.W, C.H - C.GROUND_Y);
    // Ground top edge
    ctx.fillStyle = '#2a2a14';
    ctx.fillRect(0, C.GROUND_Y, C.W, 4);
    // Grass tufts
    ctx.fillStyle = '#1e2e0a';
    const start = Math.floor(camX / 40) * 40;
    for (let gx = start; gx < camX + C.W + 40; gx += 40) {
      const sx = gx - camX;
      ctx.fillRect(sx, C.GROUND_Y - 3, 6, 3);
      ctx.fillRect(sx + 14, C.GROUND_Y - 5, 4, 5);
      ctx.fillRect(sx + 26, C.GROUND_Y - 2, 5, 2);
    }
  }

  return { drawSky, drawMountains, drawSilhouettes, drawGround };
})();
