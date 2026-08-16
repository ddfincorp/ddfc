# DDFC Partner Login Setup

This package connects the DDFC landing page's **Partner Login** button to the supplied
CRM login/admin frontend.

## Files

- `index.html` — DDFC public landing page.
- `partner-login.html` — supplied DDFC CRM login/admin page.
- `ddfc-crm-backend/` — supplied Node.js + PostgreSQL API.

## Run the backend

Requirements: Node.js 18+ and PostgreSQL.

```bash
cd ddfc-crm-backend
npm install
cp .env.example .env
```

Set `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN` in `.env`.

Then:

```bash
npm run migrate
npm start
```

The supplied frontend currently uses:

```js
const API_BASE = 'http://localhost:4000/api';
```

For deployment, change that value to your deployed API URL.

## Run the frontend

Serve this folder from a local web server (for example VS Code Live Server), rather
than opening the HTML directly as a `file://.index.html` URL.

The landing page's **Partner Login** button opens `partner-login.html`, which uses
`POST /api/auth/login` and the JWT returned by the backend.

The supplied backend README contains the full deployment/API notes.
