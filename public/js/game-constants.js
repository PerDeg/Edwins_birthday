'use strict';

const C = {
  // Logical resolution – all game coords live here
  W: 960,
  H: 540,
  GROUND_Y: 490,   // y of the top of the ground strip

  // Physics
  GRAVITY: 900,
  JUMP_V: -520,
  PLAYER_SPEED: 220,

  // Colours
  COL_GOLD:   '#c8a83c',
  COL_RED:    '#e63946',
  COL_BLACK:  '#1a1a1a',
  COL_SKIN:   '#c8956c',
  COL_BAND:   '#c0392b',

  // Level configs: [enemyRate, platformGapMin, enemySpeedBase, archerShootInterval]
  LEVELS: [
    { enemyRate: 0.30, gapMin: 160, enemySpeed: 55,  archerInterval: 999 }, // level 1 – no archers
    { enemyRate: 0.45, gapMin: 180, enemySpeed: 70,  archerInterval: 4.0 },
    { enemyRate: 0.55, gapMin: 190, enemySpeed: 85,  archerInterval: 3.5 },
    { enemyRate: 0.60, gapMin: 200, enemySpeed: 100, archerInterval: 3.0 },
    { enemyRate: 0.65, gapMin: 210, enemySpeed: 115, archerInterval: 2.5 },
    { enemyRate: 0.70, gapMin: 210, enemySpeed: 130, archerInterval: 2.0 },
  ],

  POINTS_PER_LEVEL: 500,
  MAX_LEVEL: 6,
  COMBO_TIMEOUT: 2.0,
  MAX_COMBO: 4,

  ATTACK_DURATION: 0.22,
  ATTACK_HITBOX_W: 62,
  ATTACK_HITBOX_H: 38,
  INVINCIBLE_TIME: 1.6,

  PLATFORM_W_MIN: 110,
  PLATFORM_W_MAX: 260,
  PLATFORM_GAP_EXTRA: 100,  // added to gapMin for randomness
  PLATFORM_Y_MIN: 0.28,     // fraction of H
  PLATFORM_Y_MAX: 0.78,

  // Difficulty multipliers applied on top of level config
  DIFF: {
    barn:  { lives: 5, speedMul: 0.60, shootMul: 1.6 },
    vuxen: { lives: 3, speedMul: 1.00, shootMul: 1.0 },
  },
};
