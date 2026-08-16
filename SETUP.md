# DDFC Partner Login Setup

This repo has two parts:

- `index.html` — the public DDFC landing page
- `partner-login.html` — the CRM/admin login page
- `ddfc-crm-backend/` — the Node.js + PostgreSQL API that powers login and CRM data

## 1. Start the backend

Requirements: Node.js 18+ and PostgreSQL.

```bash
cd ddfc-crm-backend
npm install
```

Use the project `.env` file already prepared in this repo, or copy from the example if needed:

```bash
cp .env.example .env
```

Make sure these values are present in `.env`:

```env
DATABASE_URL=postgres://ddfc_user:changeme@localhost:5432/ddfc_crm
JWT_SECRET=your_long_random_secret
CORS_ORIGIN=http://localhost:5500,http://127.0.0.1:5500,https://ddfincorp.github.io/ddfc
SEED_ADMIN_EMAIL=admin@ddfc.com
SEED_ADMIN_PASSWORD=Banker@2020
```

Then run:

```bash
npm run migrate
npm start
```

Check the backend health:

```bash
curl http://localhost:4000/api/health
```

## 2. Start the frontend

Serve the repo from a local web server instead of opening raw HTML files directly.

Examples:

```bash
cd ..
python -m http.server 8000
```

Then open:

- `http://localhost:8000/index.html`
- `http://localhost:8000/partner-login.html`

or use VS Code Live Server on the project root.

## 3. Partner login flow

The landing page **Partner Login** button opens `partner-login.html`.
The frontend sends a login call to:

```js
const API_BASE = 'http://localhost:4000/api';
```

It uses:

```http
POST /api/auth/login
```

and stores the returned JWT in `localStorage` for later API requests.

## 4. Default admin credentials

Use this admin account for the initial login:

- Email: `admin@ddfc.com`
- Password: `Banker@2020`

## 5. Deployment

For production, deploy the backend separately and replace the local API URL:

```js
const API_BASE = 'https://your-api-domain.com/api';
```

Also add that deployed API URL to `CORS_ORIGIN` in the backend `.env` file.

The static GitHub Pages site can continue to host `index.html`, while the API runs on a Node host such as Render, Railway, Fly.io, or a VPS.
