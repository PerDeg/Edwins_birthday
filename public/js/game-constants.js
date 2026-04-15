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
  THROW_COOLDOWN:  0.55,

  COIN_VALUE:          5,
  KILL_SCORE:         10,
  BOSS_KILL_SCORE:   150,
  LEVEL_CLEAR_BONUS: 300,

  DIFF: {
    barn:  { lives: 5, speedMul: 0.60, shootMul: 1.6 },
    vuxen: { lives: 3, speedMul: 1.00, shootMul: 1.0 },
  },

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
      coins: [
        { x: 210, y: 362 }, { x: 245, y: 362 }, { x: 280, y: 362 },
        { x: 460, y: 312 }, { x: 500, y: 312 },
        { x: 665, y: 392 }, { x: 700, y: 392 }, { x: 735, y: 392 },
        { x: 860, y: 282 }, { x: 900, y: 282 },
        { x: 1090, y: 362 }, { x: 1130, y: 362 }, { x: 1170, y: 362 },
        { x: 1310, y: 302 }, { x: 1350, y: 302 },
        { x: 1710, y: 332 }, { x: 1750, y: 332 },
        { x: 1920, y: 272 }, { x: 1960, y: 272 }, { x: 2000, y: 272 },
        { x: 2390, y: 322 }, { x: 2430, y: 322 },
        { x: 2615, y: 262 }, { x: 2655, y: 262 },
        { x: 2820, y: 372 }, { x: 2860, y: 372 }, { x: 2900, y: 372 },
        { x: 3070, y: 312 }, { x: 3110, y: 312 },
      ],
      pickups: [
        { type: 'shuriken', x: 1090, y: 354 },
        { type: 'triple',   x: 2615, y: 254 },
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
      coins: [
        { x: 190, y: 372 }, { x: 225, y: 372 }, { x: 260, y: 372 },
        { x: 410, y: 292 }, { x: 450, y: 292 },
        { x: 600, y: 232 }, { x: 640, y: 232 }, { x: 680, y: 232 },
        { x: 800, y: 342 }, { x: 840, y: 342 },
        { x: 980, y: 252 }, { x: 1020, y: 252 }, { x: 1060, y: 252 },
        { x: 1200, y: 362 }, { x: 1240, y: 362 },
        { x: 1400, y: 272 }, { x: 1440, y: 272 },
        { x: 1840, y: 282 }, { x: 1880, y: 282 },
        { x: 2270, y: 272 }, { x: 2310, y: 272 }, { x: 2350, y: 272 },
        { x: 2510, y: 352 }, { x: 2550, y: 352 },
        { x: 2730, y: 262 }, { x: 2770, y: 262 },
        { x: 2970, y: 362 }, { x: 3010, y: 362 }, { x: 3050, y: 362 },
        { x: 3200, y: 282 }, { x: 3240, y: 282 },
        { x: 3450, y: 362 }, { x: 3490, y: 362 },
        { x: 3690, y: 272 }, { x: 3730, y: 272 },
        { x: 3930, y: 352 }, { x: 3970, y: 352 },
      ],
      pickups: [
        { type: 'shuriken', x: 800,  y: 338 },
        { type: 'knife',    x: 2040, y: 368 },
        { type: 'triple',   x: 3660, y: 266 },
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
      coins: [
        { x: 180, y: 362 }, { x: 215, y: 362 }, { x: 250, y: 362 },
        { x: 400, y: 282 }, { x: 435, y: 282 },
        { x: 580, y: 392 }, { x: 615, y: 392 }, { x: 650, y: 392 },
        { x: 750, y: 248 }, { x: 785, y: 248 }, { x: 820, y: 248 },
        { x: 970, y: 358 }, { x: 1005, y: 358 },
        { x: 1160, y: 272 }, { x: 1195, y: 272 }, { x: 1230, y: 272 },
        { x: 1525, y: 272 }, { x: 1560, y: 272 },
        { x: 1760, y: 358 }, { x: 1795, y: 358 },
        { x: 1975, y: 252 }, { x: 2010, y: 252 }, { x: 2045, y: 252 },
        { x: 2190, y: 358 }, { x: 2225, y: 358 },
        { x: 2390, y: 262 }, { x: 2425, y: 262 }, { x: 2460, y: 262 },
        { x: 2615, y: 358 }, { x: 2650, y: 358 },
        { x: 2830, y: 272 }, { x: 2865, y: 272 },
        { x: 3055, y: 368 }, { x: 3090, y: 368 }, { x: 3125, y: 368 },
        { x: 3265, y: 252 }, { x: 3300, y: 252 },
        { x: 3495, y: 348 }, { x: 3530, y: 348 },
        { x: 3715, y: 262 }, { x: 3750, y: 262 }, { x: 3785, y: 262 },
        { x: 3955, y: 342 }, { x: 3990, y: 342 },
        { x: 4195, y: 258 }, { x: 4230, y: 258 },
        { x: 4435, y: 348 }, { x: 4470, y: 348 }, { x: 4505, y: 348 },
        { x: 4675, y: 268 }, { x: 4710, y: 268 },
      ],
      pickups: [
        { type: 'shuriken', x: 580,  y: 386 },
        { type: 'knife',    x: 1495, y: 266 },
        { type: 'triple',   x: 2585, y: 350 },
        { type: 'knife',    x: 3925, y: 338 },
      ],
      boss: { x: 5000, y: 293, hp: 16, type: 'demon' },
    },
  ],
};
