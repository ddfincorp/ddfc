const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const TYPES = ['Bank', 'NBFC'];
const STATUSES = ['Active', 'Pending', 'Inactive'];

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM lenders ORDER BY name');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, type, status, rate } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (type && !TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const { rows } = await pool.query(
    `INSERT INTO lenders (name, type, status, rate) VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, type || 'Bank', status || 'Active', rate || null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, type, status, rate } = req.body || {};
  if (type && !TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const { rows } = await pool.query(
    `UPDATE lenders SET
       name = COALESCE($1, name),
       type = COALESCE($2, type),
       status = COALESCE($3, status),
       rate = COALESCE($4, rate),
       updated_at = now()
     WHERE id = $5 RETURNING *`,
    [name, type, status, rate, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Lender not found' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM lenders WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Lender not found' });
  res.status(204).send();
});

module.exports = router;
