const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const ROLES = ['Super Admin', 'Sales Manager', 'Relationship Manager', 'Viewer'];

function serialize(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status };
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email, role, status FROM users ORDER BY name');
  res.json(rows.map(serialize));
});

// Only a Super Admin can create/edit/deactivate team members
router.post('/', requireRole('Super Admin'), async (req, res) => {
  const { name, email, password, role, status } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'name, email and a password of at least 6 characters are required' });
  }
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, status`,
      [name, email, hash, role || 'Relationship Manager', status || 'Active']
    );
    res.status(201).json(serialize(rows[0]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A user with that email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:id', requireRole('Super Admin'), async (req, res) => {
  const { name, email, password, role, status } = req.body || {};
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  try {
    const passwordHash = password ? await bcrypt.hash(password, 12) : null;
    const { rows } = await pool.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         password_hash = COALESCE($3, password_hash),
         role = COALESCE($4, role),
         status = COALESCE($5, status),
         updated_at = now()
       WHERE id = $6
       RETURNING id, name, email, role, status`,
      [name, email, passwordHash, role, status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(serialize(rows[0]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A user with that email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
