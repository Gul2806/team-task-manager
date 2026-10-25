const express = require('express');
const Joi = require('joi');
const pool = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

const STATUSES = ['todo', 'in_progress', 'done'];
const dateRule = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, '');

const createSchema = Joi.object({
  team_id: Joi.number().integer().required(),
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(2000).allow(''),
  status: Joi.string().valid(...STATUSES),
  assignee_id: Joi.number().integer().allow(null),
  due_date: dateRule,
});

const updateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(2000).allow(''),
  status: Joi.string().valid(...STATUSES).required(),
  assignee_id: Joi.number().integer().allow(null),
  due_date: dateRule,
});

const isMember = async (teamId, userId) => {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  );
  return rowCount > 0;
};

const SELECT_TASK = `
  SELECT t.id, t.team_id, t.title, t.description, t.status, t.assignee_id,
         to_char(t.due_date, 'YYYY-MM-DD') AS due_date, t.created_by, t.created_at,
         u.name AS assignee_name, tm.name AS team_name
  FROM tasks t
  JOIN teams tm ON tm.id = t.team_id
  LEFT JOIN users u ON u.id = t.assignee_id`;

// List tasks from my teams. Filters: ?team_id=&assignee_id=&search=
router.get('/', async (req, res, next) => {
  try {
    const { team_id, assignee_id, search } = req.query;
    const params = [req.user.id];
    let sql = `${SELECT_TASK}
      JOIN team_members m ON m.team_id = t.team_id AND m.user_id = $1
      WHERE 1=1`;

    if (team_id) {
      if (!/^\d+$/.test(team_id)) return res.status(400).json({ error: 'Invalid team_id' });
      params.push(team_id);
      sql += ` AND t.team_id = $${params.length}`;
    }
    if (assignee_id) {
      if (!/^\d+$/.test(assignee_id)) return res.status(400).json({ error: 'Invalid assignee_id' });
      params.push(assignee_id);
      sql += ` AND t.assignee_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND t.title ILIKE $${params.length}`;
    }
    sql += ' ORDER BY t.created_at DESC';

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// Create task
router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const { team_id, title, description = '', status = 'todo', assignee_id = null, due_date } = req.body;

    if (!(await isMember(team_id, req.user.id))) {
      return res.status(403).json({ error: 'Not a team member' });
    }
    if (assignee_id && !(await isMember(team_id, assignee_id))) {
      return res.status(400).json({ error: 'Assignee must be a team member' });
    }

    const { rows } = await pool.query(
      `INSERT INTO tasks (team_id, title, description, status, assignee_id, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [team_id, title, description, status, assignee_id, due_date || null, req.user.id]
    );
    const task = await pool.query(`${SELECT_TASK} WHERE t.id = $1`, [rows[0].id]);
    res.status(201).json(task.rows[0]);
  } catch (e) {
    next(e);
  }
});

// Update task
router.put('/:id', validate(updateSchema), async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid task id' });
    const id = parseInt(req.params.id, 10);

    const existing = await pool.query('SELECT team_id FROM tasks WHERE id = $1', [id]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Task not found' });
    const teamId = existing.rows[0].team_id;

    if (!(await isMember(teamId, req.user.id))) {
      return res.status(403).json({ error: 'Not a team member' });
    }
    const { title, description = '', status, assignee_id = null, due_date } = req.body;
    if (assignee_id && !(await isMember(teamId, assignee_id))) {
      return res.status(400).json({ error: 'Assignee must be a team member' });
    }

    await pool.query(
      `UPDATE tasks SET title = $1, description = $2, status = $3, assignee_id = $4, due_date = $5
       WHERE id = $6`,
      [title, description, status, assignee_id, due_date || null, id]
    );
    const task = await pool.query(`${SELECT_TASK} WHERE t.id = $1`, [id]);
    res.json(task.rows[0]);
  } catch (e) {
    next(e);
  }
});

// Delete task
router.delete('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid task id' });
    const id = parseInt(req.params.id, 10);

    const existing = await pool.query('SELECT team_id FROM tasks WHERE id = $1', [id]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Task not found' });
    if (!(await isMember(existing.rows[0].team_id, req.user.id))) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;