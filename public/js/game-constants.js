'use strict';

const C = {
  W: 960, H: 540, GROUND_Y: 490,

  GRAVITY: 900,
  JUMP_V: -520,
  PLAYER_SPEED: 220,

  COL_GOLD:  '#c8a83c',
  COL_RED:   '#e63946',
  COL_BLACK: '#1a1a1a',
  COL_SKIN:  '#c8956c',
  COL_BAND:  '#c0392b',

  COMBO_TIMEOUT: 2.0,
  MAX_COMBO: 6,

  ATTACK_DURATION:  0.22,
  ATTACK_HITBOX_W:  62,
  ATTACK_HITBOX_H:  38,
  INVINCIBLE_TIME:  1.6,

  SHURIKEN_SPEED:  420,
  KNIFE_SPEED:     360,
  THROW_COOLDOWN:  0.20,   // fast re-throw
  THROW_RANGE:     300,    // max travel distance before disappearing
  THROW_AMMO:       10,    // ammo per pickup

  COIN_VALUE:          5,
  KILL_SCORE:         10,
  BOSS_KILL_SCORE:   150,
  LEVEL_CLEAR_BONUS: 300,

  // Single-mode difficulty (no selection)
  LIVES:           5,
  ENEMY_SPEED_MUL: 0.70,
  SHOOT_MUL:       1.4,

  // Health system
  PLAYER_HP:       100,   // max player HP (percentage)
  HEART_HEAL:       20,   // HP restored per heart pickup
  CONTACT_DAMAGE:    5,   // HP lost per enemy hit
  ENEMY_HP_GRUNT:    3,   // hits to kill a grunt
  ENEMY_HP_ARCHER:   3,   // hits to kill an archer
  ARCHER_AMMO:       6,   // shots before archer stops shooting

  // Stealth system
  DETECTION_RANGE:     230,
  DETECTION_HEIGHT:    130,
  DETECTION_TIME:      0.80,
  ALERT_SPEED_MUL:     1.85,
  HEAR_RANGE:          90,
  CROUCH_SPEED:        90,
  STEALTH_KILL_BONUS:  50,

  // Patrol behaviour
  PATROL_SPEED_MUL:    0.40,   // patrol at 40% of base speed (deliberate pacing)
  PATROL_WAIT_MIN:     1.4,    // minimum stop duration at platform edge (s)
  PATROL_WAIT_MAX:     3.2,    // maximum stop duration at platform edge (s)

  // Ladder / spike
  SPIKE_DAMAGE:        10,    // HP lost per spike touch
  LADDER_SPEED:       130,    // px/s climbing speed

  // Dash attack (double-tap forward)
  DASH_SPEED:         900,    // px/s during dash
  DASH_DURATION:      0.15,   // s (~4× player width at 900px/s)
  DASH_COOLDOWN:      1.0,    // s between dashes
  DASH_DAMAGE:          2,    // enemy hp reduction per hit (double)
  DASH_TAP_WIN:        0.28,  // double-tap detection window (s)

  // Hiding mechanic
  HIDE_RANGE:          52,     // horizontal distance to interact with a hiding spot

  // Fixed level definitions — identical every run for fair score comparison
  LEVEL_DATA: [
    {
      name: 'BAMBOOSKOGEN',
      bgTheme: 0,
      width: 3700,
      enemySpeedBase: 55,
      archerInterval: 3.8,
      platforms: [
        { x: 180,  y: 390, w: 180 },   // 0
        { x: 430,  y: 340, w: 150 },   // 1
        { x: 640,  y: 420, w: 130 },   // 2
        { x: 830,  y: 310, w: 170 },   // 3
        { x: 1060, y: 390, w: 140 },   // 4
        { x: 1280, y: 330, w: 160 },   // 5
        { x: 1500, y: 430, w: 120 },   // 6
        { x: 1680, y: 360, w: 150 },   // 7
        { x: 1890, y: 300, w: 180 },   // 8
        { x: 2140, y: 410, w: 140 },   // 9
        { x: 2360, y: 350, w: 160 },   // 10
        { x: 2590, y: 290, w: 130 },   // 11
        { x: 2790, y: 400, w: 180 },   // 12
        { x: 3040, y: 340, w: 150 },   // 13
        { x: 3280, y: 370, w: 360 },   // 14 — boss arena
      ],
      enemies: [
        { type: 'grunt',  platIdx: 1 },
        { type: 'grunt',  platIdx: 3 },
        { type: 'grunt',  platIdx: 5 },
        { type: 'archer', platIdx: 7 },
        { type: 'grunt',  platIdx: 9 },
        { type: 'archer', platIdx: 11 },
        { type: 'grunt',  platIdx: 13 },
      ],
      coins: [],
      hidingSpots: [
        { type: 'barrel', x: 195,  y: 356 },   // on plat 0 (y 390)
        { type: 'shadow', x: 340,  y: 478 },   // ground
        { type: 'barrel', x: 660,  y: 386 },   // on plat 2 (y 420)
        { type: 'shadow', x: 760,  y: 478 },   // ground
        { type: 'barrel', x: 1075, y: 356 },   // on plat 4 (y 390)
        { type: 'barrel', x: 1510, y: 396 },   // on plat 6 (y 430)
        { type: 'shadow', x: 1580, y: 478 },   // ground
        { type: 'barrel', x: 1910, y: 266 },   // on plat 8 (y 300)
        { type: 'shadow', x: 2200, y: 478 },   // ground
        { type: 'barrel', x: 2605, y: 256 },   // on plat 11 (y 290)
      ],
      pickups: [
        { type: 'shuriken', x: 1090, y: 354 },
        { type: 'heart',    x: 1920, y: 260 },
        { type: 'triple',   x: 2615, y: 254 },
      ],
      groundEnemies: [
        { x: 310,  range: 180 },
        { x: 590,  range: 180 },
        { x: 870,  range: 200 },
        { x: 1220, range: 180 },
        { x: 1620, range: 200 },
        { x: 2060, range: 180 },
        { x: 2470, range: 200 },
        { x: 2870, range: 180 },
        { x: 3090, range: 180 },
      ],
      boss: { x: 3390, y: 308, hp: 8, type: 'samurai' },
    },

    {
      name: 'BERGSPASSET',
      bgTheme: 1,
      width: 4700,
      enemySpeedBase: 72,
      archerInterval: 3.0,
      platforms: [
        { x: 160,  y: 400, w: 160 },   // 0
        { x: 380,  y: 320, w: 130 },   // 1
        { x: 570,  y: 260, w: 140 },   // 2
        { x: 770,  y: 370, w: 120 },   // 3
        { x: 950,  y: 280, w: 150 },   // 4
        { x: 1170, y: 390, w: 130 },   // 5
        { x: 1370, y: 300, w: 140 },   // 6
        { x: 1580, y: 390, w: 160 },   // 7
        { x: 1810, y: 310, w: 140 },   // 8
        { x: 2040, y: 400, w: 120 },   // 9
        { x: 2240, y: 300, w: 160 },   // 10
        { x: 2480, y: 380, w: 140 },   // 11
        { x: 2700, y: 290, w: 150 },   // 12
        { x: 2940, y: 390, w: 130 },   // 13
        { x: 3170, y: 310, w: 160 },   // 14
        { x: 3420, y: 390, w: 140 },   // 15
        { x: 3660, y: 300, w: 160 },   // 16
        { x: 3900, y: 380, w: 140 },   // 17
        { x: 4100, y: 360, w: 380 },   // 18 — boss arena
      ],
      enemies: [
        { type: 'grunt',  platIdx: 0 },
        { type: 'archer', platIdx: 2 },
        { type: 'grunt',  platIdx: 3 },
        { type: 'archer', platIdx: 4 },
        { type: 'grunt',  platIdx: 6 },
        { type: 'grunt',  platIdx: 7 },
        { type: 'archer', platIdx: 8 },
        { type: 'grunt',  platIdx: 10 },
        { type: 'archer', platIdx: 12 },
        { type: 'grunt',  platIdx: 14 },
        { type: 'archer', platIdx: 16 },
        { type: 'grunt',  platIdx: 17 },
      ],
      coins: [],
      hidingSpots: [
        { type: 'barrel', x: 395,  y: 286 },   // on plat 1 (y 320)
        { type: 'shadow', x: 530,  y: 478 },   // ground
        { type: 'barrel', x: 1185, y: 356 },   // on plat 5 (y 390)
        { type: 'shadow', x: 1290, y: 478 },   // ground
        { type: 'barrel', x: 2055, y: 366 },   // on plat 9 (y 400)
        { type: 'shadow', x: 2160, y: 478 },   // ground
        { type: 'barrel', x: 2495, y: 346 },   // on plat 11 (y 380)
        { type: 'shadow', x: 2820, y: 478 },   // ground
        { type: 'barrel', x: 2955, y: 356 },   // on plat 13 (y 390)
        { type: 'barrel', x: 3435, y: 356 },   // on plat 15 (y 390)
        { type: 'shadow', x: 3580, y: 478 },   // ground
      ],
      pickups: [
        { type: 'shuriken', x: 800,  y: 338 },
        { type: 'knife',    x: 2040, y: 368 },
        { type: 'heart',    x: 2700, y: 258 },
        { type: 'triple',   x: 3660, y: 266 },
      ],
      groundEnemies: [
        { x: 290,  range: 180 },
        { x: 570,  range: 200 },
        { x: 880,  range: 180 },
        { x: 1260, range: 200 },
        { x: 1700, range: 180 },
        { x: 2120, range: 200 },
        { x: 2570, range: 180 },
        { x: 3020, range: 200 },
        { x: 3520, range: 180 },
        { x: 3870, range: 200 },
      ],
      boss: { x: 4220, y: 298, hp: 12, type: 'archer-boss' },
    },

    {
      name: 'TEMPELBORGEN',
      bgTheme: 2,
      width: 5500,
      enemySpeedBase: 90,
      archerInterval: 2.4,
      platforms: [
        { x: 150,  y: 390, w: 160 },   // 0
        { x: 370,  y: 310, w: 130 },   // 1
        { x: 555,  y: 420, w: 110 },   // 2
        { x: 720,  y: 275, w: 150 },   // 3
        { x: 940,  y: 385, w: 130 },   // 4
        { x: 1130, y: 300, w: 140 },   // 5
        { x: 1325, y: 425, w: 110 },   // 6
        { x: 1495, y: 300, w: 160 },   // 7
        { x: 1730, y: 385, w: 130 },   // 8
        { x: 1945, y: 280, w: 140 },   // 9
        { x: 2160, y: 385, w: 120 },   // 10
        { x: 2360, y: 290, w: 150 },   // 11
        { x: 2585, y: 385, w: 130 },   // 12
        { x: 2800, y: 300, w: 140 },   // 13
        { x: 3025, y: 395, w: 120 },   // 14
        { x: 3235, y: 280, w: 150 },   // 15
        { x: 3465, y: 375, w: 130 },   // 16
        { x: 3685, y: 290, w: 160 },   // 17
        { x: 3925, y: 370, w: 140 },   // 18
        { x: 4165, y: 285, w: 150 },   // 19
        { x: 4405, y: 375, w: 130 },   // 20
        { x: 4645, y: 295, w: 160 },   // 21
        { x: 4880, y: 355, w: 400 },   // 22 — boss arena
      ],
      enemies: [
        { type: 'grunt',  platIdx: 0 },
        { type: 'archer', platIdx: 1 },
        { type: 'grunt',  platIdx: 3 },
        { type: 'grunt',  platIdx: 4 },
        { type: 'archer', platIdx: 5 },
        { type: 'grunt',  platIdx: 7 },
        { type: 'archer', platIdx: 8 },
        { type: 'grunt',  platIdx: 9 },
        { type: 'archer', platIdx: 11 },
        { type: 'grunt',  platIdx: 12 },
        { type: 'grunt',  platIdx: 13 },
        { type: 'archer', platIdx: 15 },
        { type: 'grunt',  platIdx: 16 },
        { type: 'archer', platIdx: 18 },
        { type: 'grunt',  platIdx: 19 },
        { type: 'archer', platIdx: 21 },
      ],
      coins: [],
      hidingSpots: [
        { type: 'barrel', x: 165,  y: 356 },   // on plat 0 (y 390)
        { type: 'shadow', x: 300,  y: 478 },   // ground
        { type: 'barrel', x: 575,  y: 386 },   // on plat 2 (y 420)
        { type: 'barrel', x: 1140, y: 266 },   // on plat 5 (y 300)
        { type: 'shadow', x: 1340, y: 478 },   // ground
        { type: 'barrel', x: 1510, y: 266 },   // on plat 7 (y 300)
        { type: 'shadow', x: 1740, y: 478 },   // ground
        { type: 'barrel', x: 1960, y: 246 },   // on plat 9 (y 280)
        { type: 'barrel', x: 2375, y: 256 },   // on plat 11 (y 290)
        { type: 'shadow', x: 2600, y: 478 },   // ground
        { type: 'barrel', x: 2815, y: 266 },   // on plat 13 (y 300)
        { type: 'shadow', x: 3040, y: 478 },   // ground
        { type: 'barrel', x: 3250, y: 246 },   // on plat 15 (y 280)
        { type: 'barrel', x: 3700, y: 256 },   // on plat 17 (y 290)
        { type: 'shadow', x: 3940, y: 478 },   // ground
        { type: 'barrel', x: 4180, y: 251 },   // on plat 19 (y 285)
      ],
      pickups: [
        { type: 'shuriken', x: 580,  y: 386 },
        { type: 'knife',    x: 1495, y: 266 },
        { type: 'heart',    x: 2360, y: 258 },
        { type: 'triple',   x: 2585, y: 350 },
        { type: 'knife',    x: 3925, y: 338 },
      ],
      groundEnemies: [
        { x: 260,  range: 180 },
        { x: 545,  range: 200 },
        { x: 870,  range: 180 },
        { x: 1220, range: 200 },
        { x: 1640, range: 180 },
        { x: 2080, range: 200 },
        { x: 2510, range: 180 },
        { x: 2980, range: 200 },
        { x: 3460, range: 180 },
        { x: 3930, range: 200 },
        { x: 4330, range: 180 },
        { x: 4680, range: 180 },
      ],
      boss: { x: 5000, y: 293, hp: 16, type: 'demon' },
    },
  ],
};
