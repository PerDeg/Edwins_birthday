'use strict';

// ── Particle ────────────────────────────────────────────────────────────────
class Particle {
  constructor(x, y, vx, vy, color, size, lifetime, gravity = 0) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.size = size;
    this.lifetime = lifetime;
    this.age = 0;
    this.gravity = gravity;
    this.alive = true;
  }
  update(dt) {
    this.age += dt;
    if (this.age >= this.lifetime) { this.alive = false; return; }
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.vy += this.gravity * dt;
    this.vx *= Math.max(0, 1 - 3 * dt);
  }
  draw(ctx) {
    const t = this.age / this.lifetime;
    ctx.globalAlpha = (1 - t) * 0.95;
    ctx.fillStyle = this.color;
    const r = Math.max(0.5, this.size * (1 - t * 0.5));
    ctx.fillRect(this.x - r, this.y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
}

// ── SakuraPetal ──────────────────────────────────────────────────────────────
class SakuraPetal {
  constructor() { this._reset(true); }
  _reset(initial = false) {
    this.x       = initial ? Math.random() * C.W : C.W + 10;
    this.y       = initial ? Math.random() * C.H : -10;
    this.vx      = -(18 + Math.random() * 16);
    this.vy      = 16 + Math.random() * 20;
    this.rot     = Math.random() * Math.PI * 2;
    this.rotSpd  = (Math.random() - 0.5) * 2.8;
    this.size    = 3 + Math.random() * 3.5;
    this.alpha   = 0.22 + Math.random() * 0.32;
    this.wobble  = Math.random() * Math.PI * 2;
  }
  update(dt) {
    this.wobble += dt * 1.8;
    this.x += (this.vx + Math.sin(this.wobble) * 14) * dt;
    this.y += this.vy * dt;
    this.rot += this.rotSpd * dt;
    if (this.y > C.H + 12 || this.x < -24) this._reset(false);
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = '#ffb7c5';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size * 1.55, this.size * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ── FloatingText ─────────────────────────────────────────────────────────────
class FloatingText {
  constructor(x, y, text, color = '#ffd700', scale = 1) {
    this.x = x; this.y = y;
    this.text = text;
    this.color = color;
    this.scale = scale;
    this.age = 0;
    this.lifetime = 1.1;
    this.alive = true;
  }
  update(dt) {
    this.age += dt;
    this.y -= 38 * dt;
    if (this.age >= this.lifetime) this.alive = false;
  }
  draw(ctx) {
    const t = this.age / this.lifetime;
    const alpha = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    const sz = Math.round(16 * this.scale);
    ctx.font = `bold ${sz}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);   // world-space: no camX subtraction needed
    ctx.globalAlpha = 1;
  }
}

// ── Emitters ─────────────────────────────────────────────────────────────────
function emitSwordSlash(particles, x, y, facing) {
  const base = facing > 0 ? -Math.PI / 4 : -Math.PI * 3 / 4;
  for (let i = 0; i < 12; i++) {
    const a = base + (Math.PI / 2) * (i / 11);
    const spd = 80 + Math.random() * 130;
    const col = Math.random() > 0.5 ? '#fff8dc' : C.COL_GOLD;
    particles.push(new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, col, 2.5 + Math.random() * 2.5, 0.28, 120));
  }
}

function emitEnemyDeath(particles, x, y) {
  const cols = ['#ff6b35','#ff4500','#ffd700','#ff2020','#ffaa00'];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const spd = 60 + Math.random() * 190;
    particles.push(new Particle(x, y, Math.cos(a)*spd, Math.sin(a)*spd,
      cols[i % cols.length], 3.5 + Math.random() * 4, 0.65, 350));
  }
}

function emitDoubleJump(particles, x, y) {
  for (let i = 0; i < 10; i++) {
    const a = Math.PI + (Math.random() - 0.5) * Math.PI;
    const spd = 35 + Math.random() * 65;
    particles.push(new Particle(x, y, Math.cos(a)*spd, Math.sin(a)*spd, '#88ccff', 2, 0.45, 0));
  }
}

function emitHit(particles, x, y) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push(new Particle(x, y, Math.cos(a)*80, Math.sin(a)*80, '#ff4444', 3, 0.35, 0));
  }
}
