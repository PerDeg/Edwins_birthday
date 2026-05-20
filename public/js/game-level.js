'use strict';

// ── Level management ───────────────────────────────────────────────────────────

function initGame() {
  _setTouchControls(true);
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
  playerWeapon     = 'sword';
  gemPower         = false;
  throwCooldown    = 0;
  throwAmmo        = 0;
  playerHp         = C.PLAYER_HP;
  playerMaxHp      = C.PLAYER_HP;
  playerUpgrades   = {};
  playerBonusAmmo  = 0;
  streakKills      = 0;
  survivalMode     = false;
  ammoDisplayTimer = 0;
  levelTimer       = 0;
  levelKills       = 0;
  levelAlertCount  = 0;
  lastLevelRank    = '';
  groundPoundWave  = null;

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

  movingPlatforms = [];
  platforms = ld.platforms.map(p => {
    if (!p.moving) return { x: p.x, y: p.y, w: p.w, h: 14 };
    const mp = { x: p.x, y: p.y, w: p.w, h: 14,
      originX: p.x, originY: p.y,
      axis: p.axis || 'x', range: p.range || 80, speed: p.speed || 55,
      moveDir: 1, _deltaX: 0, _deltaY: 0, moving: true };
    movingPlatforms.push(mp);
    return mp;
  });
  // Also process dedicated movingPlatforms array (hardcoded in constants)
  (ld.movingPlatforms || []).forEach(p => {
    const mp = { x: p.x, y: p.y, w: p.w, h: 14,
      originX: p.x, originY: p.y,
      axis: p.axis || 'x', range: p.range || 80, speed: p.speed || 55,
      moveDir: 1, _deltaX: 0, _deltaY: 0, moving: true };
    if (p.phase) {
      const halfPeriod = mp.range / mp.speed;
      const offset = (p.phase * halfPeriod * 2) % (halfPeriod * 2);
      const sign = offset < halfPeriod ? 1 : -1;
      const dist = sign > 0 ? offset * mp.speed : (offset - halfPeriod) * mp.speed;
      if (mp.axis === 'x') mp.x = mp.originX + Math.min(mp.range, dist) * sign;
      else mp.y = mp.originY + Math.min(mp.range, dist) * sign;
    }
    platforms.push(mp);
    movingPlatforms.push(mp);
  });
  enemies         = [];
  coins           = [];
  hidingSpots = (ld.hidingSpots || []).map(h => new HidingSpot(h.type, h.x, h.y, h.rotation || 0));
  checkpoints = (ld.checkpoints || []).map(c => new Checkpoint(c.x));
  ladders     = (ld.ladders || []).map(l => new Ladder(l.x, l.y, l.w || 24, l.h || 96, l.rotation || 0));
  spikes      = (ld.spikes  || []).map(s => new Spike(s.x, s.y, s.rotation !== undefined ? s.rotation : 180));
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
        } else if (e.type === 'shield-grunt') {
          const sg = new ShieldGrunt(e.x, plat, C.ENEMY_SPEED_MUL);
          sg.vx = (Math.random() > 0.5 ? 1 : -1) * speedBase * C.ENEMY_SPEED_MUL;
          enemies.push(sg);
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
      } else if (e.type === 'shield-grunt') {
        const sg = new ShieldGrunt(ex, plat, C.ENEMY_SPEED_MUL);
        sg.vx = (Math.random() > 0.5 ? 1 : -1) * speedBase * C.ENEMY_SPEED_MUL;
        enemies.push(sg);
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

  levelTotalEnemies = enemies.length;  // track spawned count for rank
  levelTimer       = 0;
  levelKills       = 0;
  levelAlertCount  = 0;
  groundPoundWave  = null;
  smokeBombs       = [];

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
    // Show upgrade pick between levels
    _nextLevelIdx   = next;
    upgradeChoices  = _pickUpgrades(3);
    gameState = STATE.UPGRADE_PICK;
  }
}

function _pickUpgrades(count) {
  const pool = UPGRADE_POOL.filter(u => u.id !== 'heal' || playerHp < playerMaxHp);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function selectUpgrade(id) {
  switch (id) {
    case 'heal':         playerHp = Math.min(playerMaxHp, playerHp + 25); break;
    case 'ammo_plus':    playerBonusAmmo += 5; break;
    case 'hp_max':       playerMaxHp = Math.min(150, playerMaxHp + 20); playerHp = Math.min(playerMaxHp, playerHp + 20); break;
    default:             playerUpgrades[id] = true; break;
  }
  advanceToLevel(_nextLevelIdx);
}
