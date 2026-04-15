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

  // ── Sprite path ──────────────────────────────────────────────────────────
  if (typeof Sprites !== 'undefined') {
    const FRAME_W = 32, FRAME_H = 32;
    const DW = w * 2.8, DH = h * 1.85; // render larger than hitbox
    const dx = x - (DW - w) / 2;
    const dy = y - (DH - h) * 0.55;

    let spriteName, frame;
    if (state === 'attack') {
      spriteName = 'ninja-attack';
      frame = Math.floor((1 - p.attackTimer / C.ATTACK_DURATION) * 3);
    } else if (!p.onGround && p.vy < 0) {
      spriteName = 'ninja-jump'; frame = 0;
    } else if (!p.onGround) {
      spriteName = 'ninja-fall'; frame = 0;
    } else if (state === 'run') {
      spriteName = 'ninja-run';
      frame = Math.floor(p.animFrame * 1.5) % 12;
    } else {
      spriteName = 'ninja-idle';
      frame = Math.floor(p.animFrame * 0.6) % 11;
    }

    if (Sprites.draw(ctx, spriteName, frame, FRAME_W, FRAME_H,
                     dx, dy, DW, DH, facing < 0)) return;
  }
  // ── Fallback: programmatic drawing ───────────────────────────────────────

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

  if (typeof Sprites !== 'undefined') {
    const DW = w * 2.8, DH = h * 1.85;
    const dx = x - (DW - w) / 2, dy = y - (DH - h) * 0.55;
    const frame = Math.floor(animFrame * 1.2) % 8;
    if (Sprites.draw(ctx, 'grunt-run', frame, 32, 32, dx, dy, DW, DH, facing < 0)) return;
  }

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

  if (typeof Sprites !== 'undefined') {
    const DW = w * 2.8, DH = h * 1.85;
    const dx = x - (DW - w) / 2, dy = y - (DH - h) * 0.55;
    if (Sprites.draw(ctx, 'archer-idle', 0, 32, 32, dx, dy, DW, DH, facing < 0)) return;
  }

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
    this.vx = (Math.random() > 0.5 ? 1 : -1) * 55 * speedMul;
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
    this.platform    = platform;
    this.facing      = 1;
    this.shootTimer  = shootInterval * 0.5;
    this.shootInterval = shootInterval;
    this.alive = true;
    this.type  = 'archer';
    this.hits  = 0;   // 2 hits to kill
    // Slow patrol — TODO: tweak speed per level difficulty
    this.vx = (Math.random() > 0.5 ? 1 : -1) * 30 * speedMul;
    this.animFrame = 0;
    this.animTimer = 0;
  }
  update(dt, player, shurikens) {
    // Slow patrol movement
    this.x += this.vx * dt;
    const { x: px, w: pw } = this.platform;
    if (this.x < px + 6 || this.x + this.w > px + pw - 6) {
      this.vx *= -1;
      this.x   = Math.max(px + 6, Math.min(px + pw - 6 - this.w, this.x));
    }
    this.animTimer += dt;
    if (this.animTimer > 0.14) { this.animFrame = (this.animFrame + 1) % 4; this.animTimer = 0; }

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

// ── Coin ──────────────────────────────────────────────────────────────────────
class Coin {
  constructor(x, y, type = 'gold') {
    this.x = x; this.y = y;
    this.type = type;   // 'gold' | 'silver' | 'copper'
    this.w = 20; this.h = 20;
    this.alive = true;
    this.bobTimer  = Math.random() * Math.PI * 2;
    this.animFrame = Math.random() * 8;  // stagger frame start
    this.animTimer = 0;
  }
  update(dt) {
    this.bobTimer  += dt * 3.0;
    this.animTimer += dt;
    if (this.animTimer >= 0.09) { this.animTimer = 0; this.animFrame++; }
  }
  draw(ctx) {
    const by    = Math.sin(this.bobTimer) * 3;
    const drawX = this.x;
    const drawY = this.y + by;
    const spriteName = `coin-${this.type}`;

    if (typeof Sprites !== 'undefined' && Sprites.has(spriteName)) {
      Sprites.drawCoin(ctx, spriteName, this.animFrame, drawX - 2, drawY - 2, this.w + 4);
      return;
    }

    // Programmatic fallback — gold disc with shine
    const cx = drawX + this.w / 2, cy = drawY + this.h / 2;
    const colMap = { gold:'#ffd700', silver:'#c0c0c0', copper:'#b87333' };
    const rimMap = { gold:'#c8a020', silver:'#909090', copper:'#8a5320' };
    ctx.save();
    ctx.fillStyle   = colMap[this.type] || '#ffd700';
    ctx.strokeStyle = rimMap[this.type] || '#c8a020';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.ellipse(cx, cy, 8, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(cx - 2, cy - 2, 2.8, 3.8, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  bounds() { return { x: this.x, y: this.y + Math.sin(this.bobTimer) * 3, w: this.w, h: this.h }; }
}

// ── WeaponPickup ──────────────────────────────────────────────────────────────
class WeaponPickup {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.w = 24; this.h = 24;
    this.type = type;   // 'shuriken' | 'triple' | 'knife'
    this.alive = true;
    this.bobTimer = Math.random() * Math.PI * 2;
  }
  update(dt) { this.bobTimer += dt * 2.4; }
  draw(ctx) {
    const by = Math.sin(this.bobTimer) * 4;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2 + by;
    ctx.save();
    // Glow halo
    const glowCol = this.type === 'triple' ? '#ff6b35' : this.type === 'knife' ? '#4fc3f7' : '#ffffff';
    ctx.shadowColor = glowCol;
    ctx.shadowBlur  = 10 + Math.sin(this.bobTimer * 2) * 4;
    if (this.type === 'shuriken') {
      ctx.fillStyle = '#e0e0e0';
      for (let i = 0; i < 4; i++) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * Math.PI / 2 + this.bobTimer);
        ctx.beginPath(); ctx.moveTo(0,-8); ctx.lineTo(3,-3); ctx.lineTo(0,0); ctx.lineTo(-3,-3); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    } else if (this.type === 'triple') {
      ctx.fillStyle = '#ff8c35';
      [[-7,-3],[7,-3],[0,6]].forEach(([ox, oy]) => {
        for (let i = 0; i < 4; i++) {
          ctx.save(); ctx.translate(cx + ox, cy + oy); ctx.rotate(i * Math.PI / 2 + this.bobTimer);
          ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(2,-2); ctx.lineTo(0,0); ctx.lineTo(-2,-2); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      });
    } else if (this.type === 'knife') {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.4);
      ctx.fillStyle = '#4fc3f7'; ctx.fillRect(-10, -3, 22, 5);
      ctx.fillStyle = '#c8a83c'; ctx.fillRect(-14, -5, 5, 9);
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

// ── PlayerShuriken (handles shuriken / triple / knife) ────────────────────────
class PlayerShuriken {
  constructor(x, y, facing, type, angleOffset = 0) {
    this.type     = type;   // 'shuriken' | 'knife'
    this.piercing = (type === 'knife');
    const speed   = type === 'knife' ? C.KNIFE_SPEED : C.SHURIKEN_SPEED;
    this.x = x; this.y = y;
    this.vx = facing * speed * Math.cos(angleOffset);
    this.vy = speed  * Math.sin(angleOffset);
    this.rot     = 0;
    this.facing  = facing;
    this.w       = type === 'knife' ? 22 : 12;
    this.h       = type === 'knife' ? 6  : 12;
    this.alive   = true;
    this.hitSet  = new Set();   // piercing tracks already-hit enemies
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += (this.vx > 0 ? 1 : -1) * (this.type === 'knife' ? 0 : 14) * dt;
    if (this.x < -300 || this.x > 8000 || this.y > C.H + 100 || this.y < -100) this.alive = false;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.type === 'knife') {
      ctx.rotate(this.vx > 0 ? 0 : Math.PI);
      ctx.fillStyle = '#4fc3f7'; ctx.fillRect(-11, -3, 23, 6);
      ctx.fillStyle = '#c8a83c'; ctx.fillRect(-15, -5, 5, 10);
    } else {
      ctx.rotate(this.rot);
      ctx.fillStyle = '#d8d8d8';
      for (let i = 0; i < 4; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(2.5,-2); ctx.lineTo(0,0); ctx.lineTo(-2.5,-2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }
  bounds() {
    if (this.type === 'knife') return { x: this.x - 15, y: this.y - 5, w: 28, h: 10 };
    return { x: this.x - 7, y: this.y - 7, w: 14, h: 14 };
  }
}

// ── Boss ──────────────────────────────────────────────────────────────────────
class Boss {
  constructor(x, y, platform, hp, type) {
    this.platform = platform;
    this.type     = type;   // 'samurai' | 'archer-boss' | 'demon'
    this.w  = type === 'demon' ? 50 : type === 'samurai' ? 42 : 38;
    this.h  = type === 'demon' ? 72 : type === 'samurai' ? 64 : 60;
    this.x  = x;
    this.y  = y;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.hp    = hp; this.maxHp = hp;
    this.alive = true;
    this.isBoss = true;
    this.facing = -1;
    this.animFrame = 0; this.animTimer = 0;
    this.aiState = 'idle';
    this.aiTimer = 2.2;   // intro delay
    this.invincible = 0;
  }
  get phase2() { return this.hp <= Math.ceil(this.maxHp / 2); }

  update(dt, player, enemyShurikens) {
    this.facing = (player.x + player.w / 2) > (this.x + this.w / 2) ? 1 : -1;
    this.animTimer += dt;
    if (this.animTimer > 0.12) { this.animFrame = (this.animFrame + 1) % 8; this.animTimer = 0; }
    if (this.invincible > 0) this.invincible -= dt;

    this.vy += C.GRAVITY * dt;
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;

    // Clamp to platform
    const p = this.platform;
    if (this.y + this.h >= p.y) { this.y = p.y - this.h; this.vy = 0; this.onGround = true; }
    const mg = 20;
    if (this.x < p.x + mg)               { this.x = p.x + mg; if (this.vx < 0) this.vx = 0; }
    if (this.x + this.w > p.x + p.w - mg) { this.x = p.x + p.w - mg - this.w; if (this.vx > 0) this.vx = 0; }

    this.aiTimer -= dt;
    if (this.aiTimer <= 0) this._act(player, enemyShurikens);
  }

  _act(player, shurikens) {
    const dist = Math.abs((player.x + player.w / 2) - (this.x + this.w / 2));

    if (this.type === 'samurai') {
      if (this.aiState === 'charge') {
        this.vx = 0; this.aiState = 'pause'; this.aiTimer = 0.5;
      } else if (dist < 200) {
        this.vx = this.facing * 290; this.aiState = 'charge'; this.aiTimer = 0.52;
      } else {
        this.vx = this.facing * 75; this.aiState = 'walk'; this.aiTimer = 0.9;
      }

    } else if (this.type === 'archer-boss') {
      this._shoot(player, shurikens, 3);
      this.vx = this.phase2 ? this.facing * 55 : 0;
      this.aiState = 'shoot';
      this.aiTimer = this.phase2 ? 1.5 : 2.0;

    } else if (this.type === 'demon') {
      if (this.phase2 && dist < 360 && this.onGround && Math.random() < 0.45) {
        this.vy = C.JUMP_V * 0.82; this.vx = this.facing * 170;
        this.aiState = 'jump'; this.aiTimer = 1.1;
        this._shoot(player, shurikens, 2);
      } else if (dist < 240) {
        this.vx = this.facing * 230; this.aiState = 'charge'; this.aiTimer = 0.5;
      } else {
        this.vx = this.facing * 95; this.aiState = 'walk'; this.aiTimer = 0.85;
        if (this.phase2) this._shoot(player, shurikens, 2);
      }
    }
  }

  _shoot(player, shurikens, count) {
    const cx = this.x + this.w / 2, cy = this.y + this.h * 0.3;
    const tx = player.x + player.w / 2, ty = player.y + player.h * 0.4;
    const base = Math.atan2(ty - cy, tx - cx);
    const spread = count === 3 ? [-0.22, 0, 0.22] : [-0.28, 0.28];
    spread.forEach(da => shurikens.push(
      new EnemyShuriken(cx, cy, cx + Math.cos(base + da) * 300, cy + Math.sin(base + da) * 300)
    ));
  }

  takeDamage() {
    if (this.invincible > 0) return false;
    this.hp--;
    this.invincible = 0.28;
    return true;
  }

  bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

// ── drawBoss ──────────────────────────────────────────────────────────────────
function drawBoss(ctx, boss) {
  const { x, y, w, h, facing, animFrame, aiState, invincible, type } = boss;
  if (invincible > 0 && Math.floor(invincible * 22) % 2 === 0) return;

  ctx.save();
  ctx.translate(x + w / 2, y);
  if (facing < 0) ctx.scale(-1, 1);

  const swing = (aiState === 'walk' || aiState === 'charge' || aiState === 'jump')
    ? Math.sin(animFrame * Math.PI * 2) * 17 : 0;

  if (type === 'samurai') {
    // Legs
    ctx.fillStyle = '#1a1a2e';
    ctx.save(); ctx.translate(-6, h*0.50); ctx.rotate((-swing*Math.PI)/180);
    ctx.fillRect(-5,0,11,h*0.52); ctx.restore();
    ctx.save(); ctx.translate(6, h*0.50); ctx.rotate((swing*Math.PI)/180);
    ctx.fillRect(-5,0,11,h*0.52); ctx.restore();

    // Body + armour plates
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(-w*0.50, h*0.14, w, h*0.38);
    ctx.fillStyle = '#4a4a6a';
    for (let i = 0; i < 3; i++) ctx.fillRect(-w*0.44 + i*w*0.34, h*0.14, w*0.28, h*0.38);

    // Arms
    const aswing = -swing * 0.6;
    ctx.fillStyle = '#2a2a3e';
    ctx.save(); ctx.translate(-w*0.44, h*0.20); ctx.rotate((aswing*Math.PI)/180);
    ctx.fillRect(-4,0,9,h*0.34); ctx.restore();
    if (aiState === 'charge') {
      ctx.save(); ctx.translate(w*0.44, h*0.20); ctx.rotate(-Math.PI/4);
      ctx.fillStyle = '#2a2a3e'; ctx.fillRect(-4,0,9,h*0.34);
      ctx.fillStyle = '#d0d0d0'; ctx.fillRect(2,-6,50,8);
      ctx.fillStyle = C.COL_GOLD; ctx.fillRect(-6,-8,6,16);
      ctx.restore();
    } else {
      ctx.save(); ctx.translate(w*0.44, h*0.20); ctx.rotate((-aswing*Math.PI)/180);
      ctx.fillStyle = '#2a2a3e'; ctx.fillRect(-4,0,9,h*0.34); ctx.restore();
    }

    // Helmet head
    ctx.fillStyle = '#2a2a3e';
    ctx.beginPath(); ctx.ellipse(0, h*0.09, w*0.44, h*0.23, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4a4a6a';
    ctx.fillRect(-w*0.46, h*-0.04, w*0.92, h*0.16);
    ctx.beginPath(); ctx.arc(0, h*-0.04, w*0.44, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,40,40,0.85)';
    ctx.fillRect(-w*0.28, h*0.06, w*0.56, 4);

  } else if (type === 'archer-boss') {
    // Legs
    ctx.fillStyle = '#0f0f2e';
    ctx.fillRect(-w*0.30, h*0.52, 11, h*0.48);
    ctx.fillRect(w*0.12,  h*0.52, 11, h*0.48);
    // Body
    ctx.fillStyle = '#1a1a4a';
    ctx.fillRect(-w*0.46, h*0.14, w*0.92, h*0.38);
    // Crown
    ctx.fillStyle = '#bb0000';
    ctx.beginPath();
    ctx.moveTo(-w*0.42, h*-0.02);
    ctx.lineTo(-w*0.28, h*-0.20); ctx.lineTo(-w*0.10, h*-0.04);
    ctx.lineTo(0,        h*-0.22); ctx.lineTo(w*0.10,  h*-0.04);
    ctx.lineTo(w*0.28,  h*-0.20); ctx.lineTo(w*0.42,  h*-0.02);
    ctx.closePath(); ctx.fill();
    // Head
    ctx.fillStyle = '#1a1a4a';
    ctx.beginPath(); ctx.ellipse(0, h*0.09, w*0.42, h*0.22, 0, 0, Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#ffee00';
    ctx.beginPath(); ctx.arc(-w*0.16, h*0.09, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( w*0.16, h*0.09, 4, 0, Math.PI*2); ctx.fill();
    // Big bow
    ctx.save(); ctx.translate(w*0.46, h*0.26);
    ctx.strokeStyle = '#7a4010'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0,0, 28, -1.0, 1.0); ctx.stroke();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(28*Math.cos(-1), 28*Math.sin(-1));
    ctx.lineTo(28*Math.cos(1),  28*Math.sin(1));
    ctx.stroke(); ctx.restore();

  } else if (type === 'demon') {
    const p2col = boss.phase2 ? '#ff0000' : '#ff6600';
    // Wings
    ctx.fillStyle = '#2a0000';
    ctx.beginPath(); ctx.moveTo(-w*0.52, h*0.16);
    ctx.quadraticCurveTo(-w*1.3, h*-0.25, -w*0.8, h*0.58); ctx.lineTo(-w*0.52, h*0.54); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w*0.52, h*0.16);
    ctx.quadraticCurveTo(w*1.3,  h*-0.25,  w*0.8, h*0.58); ctx.lineTo(w*0.52, h*0.54); ctx.fill();
    // Legs
    ctx.fillStyle = '#3a0808';
    ctx.save(); ctx.translate(-6, h*0.50); ctx.rotate((-swing*Math.PI)/180);
    ctx.fillRect(-6,0,13,h*0.52); ctx.restore();
    ctx.save(); ctx.translate(6, h*0.50); ctx.rotate((swing*Math.PI)/180);
    ctx.fillRect(-6,0,13,h*0.52); ctx.restore();
    // Body
    ctx.fillStyle = '#5a0a0a';
    ctx.fillRect(-w*0.52, h*0.12, w*1.04, h*0.40);
    // Arms
    ctx.fillStyle = '#5a0a0a';
    ctx.save(); ctx.translate(-w*0.46, h*0.22); ctx.rotate(Math.PI*0.12);
    ctx.fillRect(-5,0,11,h*0.32); ctx.restore();
    ctx.save(); ctx.translate(w*0.46, h*0.22); ctx.rotate(-Math.PI*0.12);
    ctx.fillRect(-5,0,11,h*0.32); ctx.restore();
    // Head
    ctx.fillStyle = '#5a0a0a';
    ctx.beginPath(); ctx.ellipse(0, h*0.07, w*0.48, h*0.24, 0, 0, Math.PI*2); ctx.fill();
    // Horns
    ctx.fillStyle = '#8a2a0a';
    ctx.beginPath(); ctx.moveTo(-w*0.30, h*-0.04); ctx.lineTo(-w*0.42, h*-0.30); ctx.lineTo(-w*0.18, h*-0.04); ctx.fill();
    ctx.beginPath(); ctx.moveTo( w*0.30, h*-0.04); ctx.lineTo( w*0.42, h*-0.30); ctx.lineTo( w*0.18, h*-0.04); ctx.fill();
    // Glowing eyes
    ctx.fillStyle = p2col;
    ctx.shadowColor = p2col; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(-w*0.18, h*0.07, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( w*0.18, h*0.07, 5, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}
