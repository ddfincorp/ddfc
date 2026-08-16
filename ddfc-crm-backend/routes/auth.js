const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, password_hash, role, status FROM users WHERE lower(email) = lower($1)',
      [email]
    );
    const user = rows[0];

    // Compare against a dummy hash even when the user isn't found, so login
    // takes a similar amount of time either way (avoids leaking which emails exist).
    const hashToCheck = user ? user.password_hash : '$2a$12$C6UzMDM.H6dfI/f/IKcEeO3z1qU0oXBhpZOEBAt6ZC9nOQGKQ7Byi';
    const ok = await bcrypt.compare(password, hashToCheck);

    if (!user || !ok) {
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact your administrator.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login server error. Please try again later.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
