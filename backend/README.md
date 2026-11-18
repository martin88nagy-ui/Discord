# BartosMulti Admin API

FastAPI backend scaffold for the BartosMulti admin panel.

## Included
- PostgreSQL (production) / SQLite (local development) database layer
- Argon2 password hashing
- Opaque bearer sessions; only SHA-256 token hashes are stored
- Login, current-admin and logout endpoints
- Owner-only admin account management
- Audit log for authentication and admin account changes
- Explicit CORS origin allowlist

## Local development
From this directory:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

SQLite is used by default for local testing. Create the first owner in a second terminal:

```bash
python -m app.create_owner
```

API docs: http://127.0.0.1:8000/api/docs

## Docker / PostgreSQL
1. Copy `.env.example` to `.env`.
2. Set a long, unique PostgreSQL password in both `POSTGRES_PASSWORD` and `DATABASE_URL`.
3. Keep `.env` private; it must never be committed.
4. Start with `docker compose up --build -d`.
5. Create the first owner inside the API container:
   `docker compose exec api python -m app.create_owner`.

## API endpoints
- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/admin/users` (owner only)
- `POST /api/admin/users` (owner only)
- `PATCH /api/admin/users/{id}` (owner only)
- `DELETE /api/admin/users/{id}` (owner only)
- `GET /api/admin/audit` (authenticated admins)

Login returns a bearer token. The frontend must keep it in memory only (not localStorage or sessionStorage), send it as an Authorization header, and discard it on logout/page reload.

## Production hardening still required
This is an initial backend foundation, not a production-ready deployment. Before exposing it publicly:
- Deploy behind HTTPS and a reverse proxy.
- Add persistent login rate limiting at the proxy/API layer.
- Add database migrations (Alembic) instead of relying on create_all.
- Add password change and session revocation controls.
- Add automated tests, monitoring, backups and retention rules.
- Configure the exact production API origin in the frontend; do not expose secrets in GitHub Pages.
- Review privacy notice and Discord message-log retention before enabling chat logging.

Discord chat logs, ticket messaging and bot command toggles are not implemented yet.
