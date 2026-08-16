const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const STATUSES = ['New', 'Contacted', 'Documents', 'Approved', 'Rejected', 'Disbursed'];
const SOURCES = ['Website', 'WhatsApp', 'Referral', 'Campaign', 'Manual'];

function serialize(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    city: row.city,
    amount: Number(row.amount),
    status: row.status,
    source: row.source,
    owner: row.owner_name || null,
    ownerId: row.owner_id,
    date: row.lead_date,
  };
}

// GET /api/leads?status=&source=&owner=&q=
router.get('/', async (req, res) => {
  const { status, source, owner, q } = req.query;
  const clauses = [];
  const params = [];

  if (status) { params.push(status); clauses.push(`l.status = $${params.length}`); }
  if (source) { params.push(source); clauses.push(`l.source = $${params.length}`); }
  if (owner) { params.push(owner); clauses.push(`u.name = $${params.length}`); }
  if (q) {
    params.push(`%${q}%`);
    clauses.push(`(l.name ILIKE $${params.length} OR l.phone ILIKE $${params.length} OR l.email ILIKE $${params.length} OR l.city ILIKE $${params.length} OR l.id ILIKE $${params.length})`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT l.*, u.name AS owner_name FROM leads l
     LEFT JOIN users u ON u.id = l.owner_id
     ${where}
     ORDER BY l.created_at DESC`,
    params
  );
  res.json(rows.map(serialize));
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT l.*, u.name AS owner_name FROM leads l LEFT JOIN users u ON u.id = l.owner_id WHERE l.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
  res.json(serialize(rows[0]));
});

async function nextLeadId() {
  const { rows } = await pool.query(
    `SELECT id FROM leads WHERE id ~ '^DDFC-[0-9]+$' ORDER BY (substring(id from 6))::int DESC LIMIT 1`
  );
  const last = rows[0] ? Number(rows[0].id.split('-')[1]) : 1000;
  return `DDFC-${last + 1}`;
}

async function resolveOwnerId(ownerName) {
  if (!ownerName) return null;
  const { rows } = await pool.query('SELECT id FROM users WHERE name = $1', [ownerName]);
  return rows[0] ? rows[0].id : null;
}

router.post('/', async (req, res) => {
  const { name, phone, email, city, amount, status, source, owner, date } = req.body || {};
  if (!name || !phone || !email || !city || amount == null) {
    return res.status(400).json({ error: 'name, phone, email, city and amount are required' });
  }
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (source && !SOURCES.includes(source)) return res.status(400).json({ error: 'Invalid source' });

  try {
    const id = await nextLeadId();
    const ownerId = await resolveOwnerId(owner);
    const { rows } = await pool.query(
      `INSERT INTO leads (id, name, phone, email, city, amount, status, source, owner_id, lead_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10, CURRENT_DATE))
       RETURNING *`,
      [id, name, phone, email, city, amount, status || 'New', source || 'Website', ownerId, date || null]
    );
    await pool.query(
      `INSERT INTO lead_activity (lead_id, actor_id, action, detail) VALUES ($1,$2,'created',$3)`,
      [id, req.user.id, `Lead created by ${req.user.name}`]
    );
    const full = await pool.query(
      `SELECT l.*, u.name AS owner_name FROM leads l LEFT JOIN users u ON u.id = l.owner_id WHERE l.id = $1`,
      [rows[0].id]
    );
    res.status(201).json(serialize(full.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

router.put('/:id', async (req, res) => {
  const { name, phone, email, city, amount, status, source, owner, date } = req.body || {};
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (source && !SOURCES.includes(source)) return res.status(400).json({ error: 'Invalid source' });

  try {
    const existing = await pool.query('SELECT status FROM leads WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Lead not found' });

    const ownerId = owner !== undefined ? await resolveOwnerId(owner) : undefined;
    const { rows } = await pool.query(
      `UPDATE leads SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         email = COALESCE($3, email),
         city = COALESCE($4, city),
         amount = COALESCE($5, amount),
         status = COALESCE($6, status),
         source = COALESCE($7, source),
         owner_id = COALESCE($8, owner_id),
         lead_date = COALESCE($9, lead_date),
         updated_at = now()
       WHERE id = $10
       RETURNING *`,
      [name, phone, email, city, amount, status, source, ownerId, date, req.params.id]
    );

    if (status && status !== existing.rows[0].status) {
      await pool.query(
        `INSERT INTO lead_activity (lead_id, actor_id, action, detail) VALUES ($1,$2,'status_changed',$3)`,
        [req.params.id, req.user.id, `${existing.rows[0].status} → ${status} by ${req.user.name}`]
      );
    }

    const full = await pool.query(
      `SELECT l.*, u.name AS owner_name FROM leads l LEFT JOIN users u ON u.id = l.owner_id WHERE l.id = $1`,
      [rows[0].id]
    );
    res.json(serialize(full.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Lead not found' });
  res.status(204).send();
});

// GET /api/leads/:id/activity — audit trail for a lead
router.get('/:id/activity', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.action, a.detail, a.created_at, u.name AS actor
     FROM lead_activity a LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.lead_id = $1 ORDER BY a.created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

module.exports = router;
