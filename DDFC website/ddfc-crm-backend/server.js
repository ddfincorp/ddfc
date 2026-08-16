require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const userRoutes = require('./routes/users');
const lenderRoutes = require('./routes/lenders');
const settingsRoutes = require('./routes/settings');
const reportRoutes = require('./routes/reports');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'replace-this-with-a-long-random-string') {
  console.warn('\n⚠️  JWT_SECRET is missing or still the placeholder value. Set a real secret in .env before going live.\n');
}

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
}));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lenders', lenderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);

// 404
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// central error handler (catches anything thrown/rejected and not handled inline)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`DDFC CRM API listening on http://localhost:${port}`);
});
