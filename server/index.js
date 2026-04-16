'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const { pool, initDb } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Admin auth middleware ---
function requireAdmin(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!process.env.ADMIN_KEY || token !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// --- Input helpers ---
function sanitizeText(val, maxLen = 500) {
  if (val === null || val === undefined) return null;
  return String(val).slice(0, maxLen).trim() || null;
}

// =====================
// PUBLIC ROUTES
// =====================

// POST /api/rsvp — save RSVP
app.post('/api/rsvp', async (req, res) => {
  const name = sanitizeText(req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Namn krävs.' });

  const antal = parseInt(req.body.antal_gaster, 10);
  if (isNaN(antal) || antal < 1 || antal > 20) {
    return res.status(400).json({ error: 'Antal gäster måste vara mellan 1 och 20.' });
  }

  const matallergier = sanitizeText(req.body.matallergier);
  const halsning = sanitizeText(req.body.halsning);

  try {
    await pool.query(
      'INSERT INTO guests (name, antal_gaster, matallergier, halsning) VALUES ($1, $2, $3, $4)',
      [name, antal, matallergier, halsning]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('RSVP error:', err);
    res.status(500).json({ error: 'Serverfel, försök igen.' });
  }
});

// GET /api/levels — all saved levels (public, used by game + editor to load)
app.get('/api/levels', async (req, res) => {
  try {
    const result = await pool.query('SELECT idx, name, data FROM levels ORDER BY idx ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Levels fetch error:', err);
    res.status(500).json({ error: 'Serverfel.' });
  }
});

// PUT /api/admin/levels/:idx — upsert a level (editor save)
app.put('/api/admin/levels/:idx', requireAdmin, async (req, res) => {
  const idx = parseInt(req.params.idx, 10);
  if (isNaN(idx) || idx < 0 || idx > 99) {
    return res.status(400).json({ error: 'Ogiltigt level-index.' });
  }
  const name = sanitizeText(req.body.name || '', 60) || '';
  const data = req.body.data;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'data saknas.' });
  }
  try {
    await pool.query(
      `INSERT INTO levels (idx, name, data) VALUES ($1, $2, $3)
       ON CONFLICT (idx) DO UPDATE SET name = $2, data = $3, updated_at = NOW()`,
      [idx, name, JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Level save error:', err);
    res.status(500).json({ error: 'Serverfel.' });
  }
});

// DELETE /api/admin/levels/:idx — remove a saved level (resets to built-in)
app.delete('/api/admin/levels/:idx', requireAdmin, async (req, res) => {
  const idx = parseInt(req.params.idx, 10);
  if (isNaN(idx)) return res.status(400).json({ error: 'Ogiltigt index.' });
  try {
    await pool.query('DELETE FROM levels WHERE idx = $1', [idx]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Level delete error:', err);
    res.status(500).json({ error: 'Serverfel.' });
  }
});

// GET /api/scores — top 10 leaderboard
app.get('/api/scores', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT name, score, difficulty, level, kills, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT 10'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Scores fetch error:', err);
    res.status(500).json({ error: 'Serverfel.' });
  }
});

// POST /api/scores — submit score
app.post('/api/scores', async (req, res) => {
  const name = sanitizeText(req.body.name, 50);
  if (!name) return res.status(400).json({ error: 'Namn krävs.' });

  const score = parseInt(req.body.score, 10);
  if (isNaN(score) || score < 0) return res.status(400).json({ error: 'Ogiltigt poäng.' });

  const level = Math.max(1, parseInt(req.body.level, 10) || 1);
  const kills = Math.max(0, parseInt(req.body.kills, 10) || 0);

  try {
    await pool.query(
      'INSERT INTO scores (name, score, difficulty, level, kills) VALUES ($1, $2, $3, $4, $5)',
      [name, score, 'ninja', level, kills]
    );
    const rankResult = await pool.query(
      'SELECT COUNT(*) FROM scores WHERE score >= $1',
      [score]
    );
    const rank = parseInt(rankResult.rows[0].count, 10);
    res.status(201).json({ ok: true, rank });
  } catch (err) {
    console.error('Score submit error:', err);
    res.status(500).json({ error: 'Serverfel.' });
  }
});

// =====================
// ADMIN ROUTES
// =====================

app.get('/api/admin/guests', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM guests ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Admin guests error:', err);
    res.status(500).json({ error: 'Serverfel.' });
  }
});

app.get('/api/admin/scores', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM scores ORDER BY score DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Admin scores error:', err);
    res.status(500).json({ error: 'Serverfel.' });
  }
});

app.delete('/api/admin/reset', requireAdmin, async (req, res) => {
  try {
    await pool.query('TRUNCATE guests, scores RESTART IDENTITY');
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin reset error:', err);
    res.status(500).json({ error: 'Serverfel.' });
  }
});

// =====================
// START
// =====================
const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
