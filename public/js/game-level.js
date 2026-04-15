'use strict';

// ── Level management ───────────────────────────────────────────────────────────

function initGame(diff) {
  difficulty   = diff;
  Audio.start();
  HUD.reset();

  player        = new Player(difficulty);
  particles     = [];
  floatingTexts = [];
  petals        = Array.from({ length: 25 }, () => new SakuraPetal());

  score         = 0;
  combo         = 1;
  comboTimer    = 0;
  lives         = C.DIFF[difficulty].lives;
  kills         = 0;
  screenFlash   = 0;
  playerWeapon  = 'sword';
  throwCooldown = 0;

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
  coins           = ld.coins.map(c => new Coin(c.x, c.y));
  pickups         = ld.pickups.map(p => new WeaponPickup(p.x, p.y, p.type));
  playerShurikens = [];
  shurikens       = [];

  const diff      = C.DIFF[difficulty];
  const speedBase = ld.enemySpeedBase;
  const shootInt  = ld.archerInterval * diff.shootMul;

  ld.enemies.forEach(e => {
    const plat = platforms[e.platIdx];
    if (!plat) return;
    const ex = plat.x + plat.w * 0.35;
    if (e.type === 'grunt') {
      const g = new Grunt(ex, plat, diff.speedMul);
      g.vx = (Math.random() > 0.5 ? 1 : -1) * speedBase * diff.speedMul;
      enemies.push(g);
    } else {
      enemies.push(new Archer(ex, plat, diff.speedMul, shootInt));
    }
  });

  const bd       = ld.boss;
  const bossPlat = platforms[platforms.length - 1];
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
