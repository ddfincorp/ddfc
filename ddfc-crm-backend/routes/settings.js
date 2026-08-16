const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT key, value FROM settings');
  const settings = {};
  rows.forEach((r) => { settings[r.key] = r.value; });
  res.json({
    whatsappNumber: settings.whatsapp_number || '',
    whatsappMessage: settings.whatsapp_message || '',
  });
});

router.put('/', requireRole('Super Admin', 'Sales Manager'), async (req, res) => {
  const { whatsappNumber, whatsappMessage } = req.body || {};
  const number = String(whatsappNumber || '').replace(/\D/g, '');
  if (!number) return res.status(400).json({ error: 'A WhatsApp number is required' });

  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('whatsapp_number', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [number]
  );
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('whatsapp_message', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [whatsappMessage || '']
  );
  res.json({ whatsappNumber: number, whatsappMessage: whatsappMessage || '' });
});

module.exports = router;
