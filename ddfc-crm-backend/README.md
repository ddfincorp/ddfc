# DDFC CRM — Backend (Node.js + PostgreSQL)

Real API + database backend for the DDFC CRM admin panel, replacing the
prototype's browser `localStorage` (and its plaintext-password login) with:

- PostgreSQL storage for leads, team members, lenders and settings
- Hashed passwords (bcrypt) and JWT-based login sessions
- A REST API the front-end HTML file calls instead of reading/writing `localStorage`
- A basic audit trail (`lead_activity`) for status changes

## 1. Prerequisites

- Node.js 18+
- A PostgreSQL database (local Postgres, or a managed one — Render, Railway,
  Supabase, RDS, etc. all work — the backend just needs a connection string)

## 2. Setup

```bash
cd ddfc-crm-backend
npm install
cp .env.example .env
```

Edit `.env`:

- `DATABASE_URL` — your Postgres connection string
- `JWT_SECRET` — generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `CORS_ORIGIN` — the URL(s) you'll serve the CRM HTML file from (e.g.
  `http://localhost:5500` if you open it with VS Code's Live Server, or your
  real domain once deployed)

Create the tables and seed the first admin login:

```bash
npm run migrate
```

This prints a generated Super Admin email/password the first time it runs
(or use `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars to set your own
before running it). It's safe to re-run — it won't touch existing users.

Start the API:

```bash
npm start
```

The API listens on `http://localhost:4000` by default. Check it's up:

```bash
curl http://localhost:4000/api/health
```

## 3. Connecting the front-end

Open the CRM HTML file and set the API base URL near the top of its
`<script>` block:

```js
const API_BASE = 'http://localhost:4000/api'; // change to your deployed URL
```

The updated front-end (`ddfc-crm-admin-connected.html`, included alongside
this backend) already does this — it logs in against `POST /api/auth/login`,
stores the returned token, and sends it as `Authorization: Bearer <token>`
on every request. Update `API_BASE` there before deploying.

## 4. API overview

All routes below (except `/api/auth/login` and `/api/health`) require header
`Authorization: Bearer <token>` from a successful login.

| Method | Path                    | Purpose                                  |
|--------|-------------------------|-------------------------------------------|
| POST   | `/api/auth/login`       | Log in, returns `{ token, user }`         |
| GET    | `/api/auth/me`          | Current logged-in user                    |
| GET    | `/api/leads`            | List leads (`?status=&source=&owner=&q=`) |
| POST   | `/api/leads`            | Create a lead                             |
| GET    | `/api/leads/:id`        | One lead                                  |
| PUT    | `/api/leads/:id`        | Update a lead                             |
| DELETE | `/api/leads/:id`        | Delete a lead                             |
| GET    | `/api/leads/:id/activity` | Audit trail for a lead                  |
| GET    | `/api/users`            | List team members                         |
| POST   | `/api/users`            | Add team member (Super Admin only)        |
| PUT    | `/api/users/:id`        | Edit team member (Super Admin only)       |
| GET    | `/api/lenders`          | List lender partners                      |
| POST   | `/api/lenders`          | Add lender partner                        |
| PUT    | `/api/lenders/:id`      | Edit lender partner                       |
| DELETE | `/api/lenders/:id`      | Remove lender partner                     |
| GET    | `/api/settings`         | Get WhatsApp number/message                |
| PUT    | `/api/settings`         | Update WhatsApp number/message             |
| GET    | `/api/reports/summary`  | Totals, pipeline value, breakdowns         |

"Leads", "Applications" and "Customers" in the UI are all views over the same
`leads` table, filtered by `status` — same as the original prototype.

## 5. Deploying

Any Node host works (Render, Railway, Fly.io, a VPS, etc.):

1. Provision a Postgres instance there (or point `DATABASE_URL` at one you
   already have) and run `npm run migrate` once against it.
2. Set the env vars from `.env.example` in the host's dashboard.
3. Deploy this folder; start command is `npm start`.
4. Serve the HTML file from any static host (Netlify, Vercel, S3, or the
   same server) with `API_BASE` pointed at the deployed API URL, and add
   that URL to `CORS_ORIGIN`.

## 6. Still on you before this touches real customer data

This backend fixes the biggest gaps (real database, hashed passwords, auth
tokens, an audit trail) but a few things are deliberately left for you to
decide based on your hosting/compliance setup, per the prototype's own
checklist:

- Put the server behind HTTPS (most hosts do this automatically)
- Set `PGSSL=true` if your Postgres provider requires SSL (most managed ones do)
- Rotate `JWT_SECRET` and re-deploy if it's ever exposed
- Add rate limiting on `/api/auth/login` if this is public-facing
- Decide on data retention / backup policy for customer KYC and financial data
