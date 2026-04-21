'use strict';

// ── Level management ───────────────────────────────────────────────────────────

function initGame() {
  Audio.start();
  HUD.reset();

  player        = new Player();
  particles     = [];
  floatingTexts = [];
  petals        = [];

  score         = 0;
  combo         = 1;
  comboTimer    = 0;
  lives         = C.LIVES;
  kills         = 0;
  screenFlash   = 0;
  playerWeapon  = 'sword';
  gemPower      = false;
  throwCooldown = 0;
  throwAmmo     = 0;

  loadLevel(0);
  gameState = STATE.PLAYING;
}

function loadLevel(idx) {
  currentLevelIdx = idx;
  const ld  = C.LEVEL_DATA[idx];
  bgTheme    = ld.bgTheme;
  levelWidth = ld.width;
  level      = idx + 1;
  Background.setTheme(bgTheme);

  platforms       = ld.platforms.map(p => ({ x: p.x, y: p.y, w: p.w, h: 14 }));
  enemies         = [];
  coins           = [];
  hidingSpots     = (ld.hidingSpots || []).map(h => new HidingSpot(h.type, h.x, h.y));
  pickups         = ld.pickups.map(p => new WeaponPickup(p.x, p.y, p.type));
  playerShurikens = [];
  shurikens       = [];

  const speedBase = ld.enemySpeedBase;
  const shootInt  = ld.archerInterval * C.SHOOT_MUL;

  // Detect format: flat (editor/DB) uses {x, ground} on enemies; old format uses {platIdx}
  const isFlatFormat = ld.enemies.length === 0 || ('ground' in ld.enemies[0]);

  if (isFlatFormat) {
    // ── Flat format (editor / DB) ─────────────────────────────────────────────
    ld.enemies.forEach(e => {
      if (e.ground) {
        const range     = e.range || 200;
        const groundPlat = { x: e.x - range / 2, y: C.GROUND_Y, w: range, h: 14 };
        const g = new Grunt(e.x, groundPlat, C.ENEMY_SPEED_MUL);
        g.vx = (Math.random() > 0.5 ? 1 : -1) * speedBase * C.ENEMY_SPEED_MUL;
        enemies.push(g);
      } else {
        // Find the platform this enemy sits on (by x overlap)
        const plat = platforms.find(p => e.x >= p.x - 4 && e.x <= p.x + p.w + 4);
        if (!plat) return;
        if (e.type === 'grunt') {
          const g = new Grunt(e.x, plat, C.ENEMY_SPEED_MUL);
          g.vx = (Math.random() > 0.5 ? 1 : -1) * speedBase * C.ENEMY_SPEED_MUL;
          enemies.push(g);
        } else {
          enemies.push(new Archer(e.x, plat, C.ENEMY_SPEED_MUL, shootInt));
        }
      }
    });
  } else {
    // ── Old platIdx format (hardcoded C.LEVEL_DATA) ───────────────────────────
    ld.enemies.forEach(e => {
      const plat = platforms[e.platIdx];
      if (!plat) return;
      const ex = plat.x + plat.w * 0.35;
      if (e.type === 'grunt') {
        const g = new Grunt(ex, plat, C.ENEMY_SPEED_MUL);
        g.vx = (Math.random() > 0.5 ? 1 : -1) * speedBase * C.ENEMY_SPEED_MUL;
        enemies.push(g);
      } else {
        enemies.push(new Archer(ex, plat, C.ENEMY_SPEED_MUL, shootInt));
      }
    });
    // Old format ground enemies (separate array)
    if (ld.groundEnemies) {
      ld.groundEnemies.forEach(e => {
        const groundPlat = { x: e.x, y: C.GROUND_Y, w: e.range, h: 14 };
        const ex = e.x + e.range * 0.35;
        const g = new Grunt(ex, groundPlat, C.ENEMY_SPEED_MUL);
        g.vx = (Math.random() > 0.5 ? 1 : -1) * speedBase * C.ENEMY_SPEED_MUL;
        enemies.push(g);
      });
    }
  }

  const bd       = ld.boss;
  // Find the platform containing the boss x, fallback to last platform
  const bossPlat = platforms.find(p => bd.x >= p.x && bd.x <= p.x + p.w) || platforms[platforms.length - 1];
  boss = new Boss(bd.x, bd.y, bossPlat, bd.hp, bd.type);

  cam.x = 0; cam.shake = 0; cam.shakeDur = 0;
  if (player) {
    player.x = 100; player.y = 380;
    player.vx = 0;  player.vy = 0;
    player.onGround = false; player.jumpsLeft = 2;
  }
}

function advanceToLevel(idx) {
  loadLevel(idx);
  player.invincible = 1.8;
  UI.triggerLevelUp(C.LEVEL_DATA[idx].name);
  gameState = STATE.PLAYING;
}

function advanceNextLevel() {
  const next = currentLevelIdx + 1;
  if (next >= C.LEVEL_DATA.length) {
    gameState = STATE.VICTORY;
  } else {
    advanceToLevel(next);
  }
}
