'use strict';
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS guests (
          id           SERIAL PRIMARY KEY,
          name         TEXT NOT NULL,
          antal_gaster INTEGER NOT NULL DEFAULT 1,
          matallergier TEXT,
          halsning     TEXT,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS scores (
          id         SERIAL PRIMARY KEY,
          name       TEXT NOT NULL,
          score      INTEGER NOT NULL,
          difficulty TEXT NOT NULL DEFAULT 'ninja',
          level      INTEGER NOT NULL DEFAULT 1,
          kills      INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.log('Database initialized successfully.');
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.log(`DB init attempt ${attempt} failed, retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

module.exports = { pool, initDb };
