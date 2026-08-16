# DDFC CRM — Agent Instructions

This is a full-stack Node.js + PostgreSQL CRM application with a backend API and static frontend.

## Quick Start Commands

**Backend setup & development:**
```bash
cd ddfc-crm-backend
npm install
npm run migrate     # Create tables and seed first admin
npm start           # Run on port 4000
npm run dev         # Development with --watch
```

**Frontend:**
Serve HTML files from a local web server (e.g., VS Code Live Server, `python -m http.server 8000`).

**API health check:**
```bash
curl http://localhost:4000/api/health
```

For detailed setup and environment configuration, see [SETUP.md](SETUP.md) and [ddfc-crm-backend/README.md](ddfc-crm-backend/README.md).

## Architecture

### Backend Structure
- **server.js** — Express app, CORS setup, route mounting, error handler
- **db/** — PostgreSQL schema, migrations, connection pool
- **middleware/auth.js** — JWT verification and role-based access control (`requireAuth`, `requireRole`)
- **routes/** — RESTful endpoints for auth, leads, users, lenders, settings, reports

### Database Schema
Core entities (see [db/schema.sql](ddfc-crm-backend/db/schema.sql)):
- **users** — CRM team members with roles (Super Admin, Sales Manager, Relationship Manager, Viewer)
- **leads** — Loan/financing prospects with status workflow (New → Contacted → Documents → Approved/Rejected/Disbursed)
- **lenders** — Banks and NBFCs offering products
- **settings** — Key/value config store for CRM-wide settings
- **lead_activity** — Append-only audit trail for lead changes

### API Routes
- `POST /api/auth/login` — JWT-based login
- `GET /api/auth/me` — Current user profile
- `/api/leads`, `/api/users`, `/api/lenders`, `/api/settings`, `/api/reports` — CRUD + filtering

## Authentication & Authorization

- **JWT tokens** stored in `localStorage` on the frontend, sent as `Authorization: Bearer <token>`
- **Roles** determine permissions:
  - Super Admin: Full access
  - Sales Manager: Lead management
  - Relationship Manager: Lead follow-up
  - Viewer: Read-only
- **Default credentials** (initial login):
  - Email: `admin@ddfc.com`
  - Password: `Banker@2020`

Use middleware:
```js
const { requireAuth, requireRole } = require('../middleware/auth');
router.get('/endpoint', requireAuth, requireRole('Super Admin'), handler);
```

## Common Patterns

### Database Queries
```js
const pool = require('../db/pool');
const { rows } = await pool.query('SELECT * FROM leads WHERE owner_id = $1', [userId]);
```

### Error Handling
- Return JSON with `{ error: 'message' }` and appropriate HTTP status codes
- Central error handler in server.js catches unhandled errors (500 response)
- Timing-safe password comparison for login (avoids email enumeration)

### Password Security
- Hash with **bcryptjs** (salt rounds: 12)
- Verify during login: `await bcrypt.compare(password, user.password_hash)`
- Migration script in `db/migrate.js` handles initial seeding

### CORS & Frontend Integration
- `CORS_ORIGIN` env var controls allowed frontend URLs (comma-separated)
- Frontend sends credentials with requests (`withCredentials: true` in fetch)

## Development Workflow

1. **Modify a route** → Test with `curl` or Postman
2. **Add database migration** → Update [db/schema.sql](ddfc-crm-backend/db/schema.sql), re-run `npm run migrate`
3. **Add a new endpoint** → Create file in [routes/](ddfc-crm-backend/routes/), mount in server.js
4. **Debug SQL** → Check `db/pool.js` for connection details; logs appear in console
5. **Frontend issues** → Check localStorage (browser DevTools), API URL in HTML, CORS settings

## Key Files to Know

| File | Purpose |
|------|---------|
| [server.js](ddfc-crm-backend/server.js) | Express app setup, route mounting, CORS, error handler |
| [db/schema.sql](ddfc-crm-backend/db/schema.sql) | Database schema definition |
| [db/migrate.js](ddfc-crm-backend/db/migrate.js) | Migration runner and admin seeding |
| [middleware/auth.js](ddfc-crm-backend/middleware/auth.js) | JWT verification, role guards |
| [routes/auth.js](ddfc-crm-backend/routes/auth.js) | Login, user profile, JWT issuance |
| [partner-login.html](partner-login.html) | CRM/admin login frontend |

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Long random secret (generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- `CORS_ORIGIN` — Comma-separated frontend URLs
- `JWT_EXPIRES_IN` (optional, defaults to '12h')
- `PORT` (optional, defaults to 4000)

See [.env.example](ddfc-crm-backend/.env.example) for a template.

## Deployment Notes

- Backend: Separate Node.js host (Render, Railway, Fly.io, VPS)
- Frontend: Static site (GitHub Pages, CDN, or same host as API)
- Production: Set real `JWT_SECRET`, update `CORS_ORIGIN`, configure PostgreSQL (managed DB or self-hosted)
- **Security checklist**: Enable HTTPS, set secure cookies, validate all input, review `schema.sql` constraints

## Common Troubleshooting

- **"Missing or invalid Authorization header"** → Frontend not sending JWT in Authorization header
- **CORS error** → Check `CORS_ORIGIN` env var includes frontend URL
- **Database connection failed** → Verify `DATABASE_URL`, PostgreSQL is running, credentials are correct
- **Login returns 401** → Verify admin credentials, check password hash in database (should start with `$2a$` or `$2b$`)
