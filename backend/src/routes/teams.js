const express = require('express');
const Joi = require('joi');
const pool = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

const teamSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
});
const memberSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
});

const parseId = (v) => (/^\d+$/.test(v) ? parseInt(v, 10) : null);

// Create team (creator becomes a member)
router.post('/', validate(teamSchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO teams (name, created_by) VALUES ($1, $2) RETURNING *',
      [req.body.name, req.user.id]
    );
    await client.query('INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)', [
      rows[0].id,
      req.user.id,
    ]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
});

// List my teams
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.* FROM teams t
       JOIN team_members m ON m.team_id = t.id
       WHERE m.user_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// List members of a team (must be a member)
router.get('/:id/members', async (req, res, next) => {
  try {
    const teamId = parseId(req.params.id);
    if (!teamId) return res.status(400).json({ error: 'Invalid team id' });

    const check = await pool.query(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );
    if (!check.rowCount) return res.status(403).json({ error: 'Not a team member' });

    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email FROM users u
       JOIN team_members m ON m.user_id = u.id
       WHERE m.team_id = $1 ORDER BY u.name`,
      [teamId]
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// Add member by email (team creator only)
router.post('/:id/members', validate(memberSchema), async (req, res, next) => {
  try {
    const teamId = parseId(req.params.id);
    if (!teamId) return res.status(400).json({ error: 'Invalid team id' });

    const team = await pool.query('SELECT created_by FROM teams WHERE id = $1', [teamId]);
    if (!team.rowCount) return res.status(404).json({ error: 'Team not found' });
    if (team.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the team creator can add members' });
    }

    const user = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [
      req.body.email,
    ]);
    if (!user.rowCount) return res.status(404).json({ error: 'No user with that email' });

    await pool.query(
      'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [teamId, user.rows[0].id]
    );
    res.status(201).json(user.rows[0]);
  } catch (e) {
    next(e);
  }
});

module.exports = router;