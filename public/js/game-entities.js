'use strict';

// ── Drawing helpers ──────────────────────────────────────────────────────────
function drawShuriken(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#c8c8c8';
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate(i * Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(2.5, -2); ctx.lineTo(0, 0); ctx.lineTo(-2.5, -2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawNinjaPlayer(ctx, p) {
  const { x, y, w, h, facing, animFrame, state, invincible } = p;
  if (invincible > 0 && Math.floor(invincible * 10) % 2 === 0) return; // blink

  ctx.save();
  ctx.translate(x + w / 2, y);
  if (facing < 0) ctx.scale(-1, 1);

  const legSwing  = (state === 'run') ? Math.sin(animFrame * Math.PI * 2.5) * 14 : 0;
  const armSwing  = -legSwing * 0.6;
  const headBob   = (state === 'run') ? Math.abs(Math.sin(animFrame * Math.PI * 2.5)) * 2 : 0;

  // Back leg
  ctx.fillStyle = C.COL_BLACK;
  ctx.save(); ctx.translate(-4, h * 0.55); ctx.rotate((-legSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, h * 0.48); ctx.restore();

  // Front leg
  ctx.save(); ctx.translate(4, h * 0.55); ctx.rotate((legSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, h * 0.48); ctx.restore();

  // Body
  ctx.fillStyle = C.COL_BLACK;
  ctx.fillRect(-w * 0.45, h * 0.18, w * 0.9, h * 0.38);

  // Back arm
  ctx.save(); ctx.translate(-w * 0.35, h * 0.24); ctx.rotate((armSwing * Math.PI) / 180);
  ctx.fillStyle = C.COL_BLACK;
  ctx.fillRect(-3.5, 0, 7, h * 0.34); ctx.restore();

  // Front arm / sword
  if (state === 'attack') {
    const prog = Math.min(1, p.attackTimer / (C.ATTACK_DURATION * 0.5));
    ctx.save(); ctx.translate(w * 0.35, h * 0.24);
    ctx.rotate((-Math.PI / 4 + prog * Math.PI * 0.65));
    ctx.fillStyle = C.COL_BLACK; ctx.fillRect(-3.5, 0, 7, h * 0.34);
    // Blade
    ctx.fillStyle = '#d4d4d4'; ctx.fillRect(0, -3, 38, 6);
    // Hilt
    ctx.fillStyle = C.COL_GOLD; ctx.fillRect(-5, -6, 5, 12);
    ctx.restore();
  } else {
    ctx.save(); ctx.translate(w * 0.35, h * 0.24);
    ctx.rotate((-armSwing * Math.PI) / 180);
    ctx.fillStyle = C.COL_BLACK; ctx.fillRect(-3.5, 0, 7, h * 0.34);
    // Sheathed sword on back
    ctx.fillStyle = '#888'; ctx.fillRect(-w * 0.6, h * 0.14, 4, h * 0.38);
    ctx.restore();
  }

  // Head
  const headY = h * 0.05 - headBob;
  ctx.fillStyle = C.COL_BLACK;
  ctx.beginPath(); ctx.ellipse(0, headY + h * 0.10, w * 0.38, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();

  // Eye slit
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(w * 0.04, headY + h * 0.05, w * 0.28, 3);

  // Headband
  ctx.fillStyle = C.COL_BAND;
  ctx.fillRect(-w * 0.42, headY - h * 0.01, w * 0.84, 5);
  // Band tail
  ctx.fillStyle = C.COL_BAND;
  ctx.beginPath();
  ctx.moveTo(w * 0.34, headY + 4);
  ctx.lineTo(w * 0.50 + Math.sin(animFrame * 8) * 3, headY + h * 0.18);
  ctx.lineTo(w * 0.28, headY + h * 0.18);
  ctx.closePath(); ctx.fill();

  ctx.restore();
}

function drawGrunt(ctx, e) {
  const { x, y, w, h, facing, animFrame } = e;
  const legSwing = Math.sin(animFrame * Math.PI * 2.2) * 12;

  ctx.save();
  ctx.translate(x + w / 2, y);
  if (facing < 0) ctx.scale(-1, 1);

  const DARK_RED = '#5c1010';
  const MED_RED  = '#7a1c1c';

  // Legs
  ctx.fillStyle = DARK_RED;
  ctx.save(); ctx.translate(-3, h * 0.52); ctx.rotate((-legSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, h * 0.50); ctx.restore();
  ctx.save(); ctx.translate(3, h * 0.52); ctx.rotate((legSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, h * 0.50); ctx.restore();

  // Body – stockier
  ctx.fillStyle = MED_RED;
  ctx.fillRect(-w * 0.48, h * 0.16, w * 0.96, h * 0.38);

  // Arms
  ctx.fillStyle = DARK_RED;
  const armSwing = -legSwing * 0.5;
  ctx.save(); ctx.translate(-w*0.4, h*0.22); ctx.rotate((armSwing * Math.PI)/180);
  ctx.fillRect(-4, 0, 8, h * 0.32); ctx.restore();
  ctx.save(); ctx.translate(w*0.4, h*0.22); ctx.rotate((-armSwing * Math.PI)/180);
  ctx.fillRect(-4, 0, 8, h * 0.32); ctx.restore();

  // Head
  ctx.fillStyle = MED_RED;
  ctx.beginPath(); ctx.ellipse(0, h * 0.10, w * 0.40, h * 0.20, 0, 0, Math.PI * 2); ctx.fill();
  // Eyes
  ctx.fillStyle = '#ff4444';
  ctx.beginPath(); ctx.arc(w * 0.14, h * 0.08, 2.5, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function drawArcher(ctx, e) {
  const { x, y, w, h, facing } = e;
  ctx.save();
  ctx.translate(x + w / 2, y);
  if (facing < 0) ctx.scale(-1, 1);

  // Body
  ctx.fillStyle = '#2a2a5a';
  ctx.fillRect(-w * 0.4, h * 0.16, w * 0.8, h * 0.38);
  // Legs
  ctx.fillStyle = '#1a1a3a';
  ctx.fillRect(-w * 0.28, h * 0.54, 10, h * 0.46);
  ctx.fillRect(w * 0.10,  h * 0.54, 10, h * 0.46);
  // Bow arm
  ctx.save(); ctx.translate(w * 0.38, h * 0.26);
  ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 22, -0.9, 0.9); ctx.stroke();
  // String
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(22 * Math.cos(-0.9), 22 * Math.sin(-0.9));
  ctx.lineTo(22 * Math.cos(0.9),  22 * Math.sin(0.9));
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.restore();
  // Head
  ctx.fillStyle = '#2a2a5a';
  ctx.beginPath(); ctx.ellipse(0, h * 0.10, w * 0.36, h * 0.20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffcc00'; // yellow eyes
  ctx.beginPath(); ctx.arc(w * 0.14, h * 0.08, 2.5, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ── Entity classes ────────────────────────────────────────────────────────────
class Player {
  constructor(difficulty) {
    const d = C.DIFF[difficulty];
    this.x = 100; this.y = 300;
    this.w = 30; this.h = 48;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.jumpsLeft = 2;
    this.facing = 1;
    this.state = 'idle';      // idle | run | jump | attack
    this.animFrame = 0;
    this.animTimer = 0;
    this.attacking = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.invincible = 0;
    this.lives = d.lives;
    this.alive = true;
  }
  get attackActive() {
    return this.attacking && this.attackTimer > C.ATTACK_DURATION * 0.4;
  }
  attackHitbox() {
    const ox = this.facing > 0 ? this.x + this.w : this.x - C.ATTACK_HITBOX_W;
    return { x: ox, y: this.y + 8, w: C.ATTACK_HITBOX_W, h: C.ATTACK_HITBOX_H };
  }
  bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

class Grunt {
  constructor(px, platform, speedMul) {
    this.x = px; this.y = platform.y - 48;
    this.w = 28; this.h = 48;
    this.platform = platform;
    const spd = C.LEVELS[0].enemySpeed; // overridden by caller
    this.vx = (Math.random() > 0.5 ? 1 : -1) * spd * speedMul;
    this.facing = this.vx > 0 ? 1 : -1;
    this.animFrame = 0;
    this.animTimer = 0;
    this.alive = true;
    this.type = 'grunt';
  }
  update(dt) {
    this.x += this.vx * dt;
    const { x: px, w: pw } = this.platform;
    if (this.x < px || this.x + this.w > px + pw) {
      this.vx *= -1; this.facing *= -1;
      this.x = Math.max(px, Math.min(px + pw - this.w, this.x));
    }
    this.animTimer += dt;
    if (this.animTimer > 0.14) { this.animFrame = (this.animFrame + 1) % 4; this.animTimer = 0; }
  }
  bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

class Archer {
  constructor(px, platform, speedMul, shootInterval) {
    this.x = px; this.y = platform.y - 48;
    this.w = 28; this.h = 48;
    this.platform = platform;
    this.facing = 1;
    this.shootTimer = shootInterval * 0.5;
    this.shootInterval = shootInterval;
    this.alive = true;
    this.type = 'archer';
    this.hits = 0; // 2 hits to kill
  }
  update(dt, player, shurikens) {
    this.facing = player.x > this.x ? 1 : -1;
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.shootInterval;
      shurikens.push(new EnemyShuriken(
        this.x + this.w / 2, this.y + this.h * 0.3,
        player.x + player.w / 2, player.y + player.h * 0.4
      ));
    }
  }
  bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

class EnemyShuriken {
  constructor(sx, sy, tx, ty) {
    const a = Math.atan2(ty - sy, tx - sx);
    this.x = sx; this.y = sy;
    this.vx = Math.cos(a) * 210;
    this.vy = Math.sin(a) * 210;
    this.rot = 0;
    this.w = 14; this.h = 14;
    this.alive = true;
  }
  update(dt, camX) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += 9 * dt;
    if (this.x < camX - 120 || this.x > camX + C.W + 120) this.alive = false;
    if (this.y > C.H + 50) this.alive = false;
  }
  bounds() { return { x: this.x - 7, y: this.y - 7, w: 14, h: 14 }; }
}

// ── AABB collision ─────────────────────────────────────────────────────────
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
