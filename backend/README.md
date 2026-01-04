# Backend Postgres Reactions

The backend supports persistent reaction storage with Postgres. To enable it:

- Start a Postgres DB and set the DATABASE_URL environment variable, for example:
  - export DATABASE_URL=postgres://user:pass@localhost:5432/dbname

- Run the migration helper (requires `pg` module installed):
  - cd backend && node scripts/migrate-reactions.js

- Or let the server run its own migration on startup if `pg` is installed and `DATABASE_URL` is set.

If `DATABASE_URL` is not set the server will continue to use Redis (if configured) or in-memory storage as a fallback.

Sentiment Provider
------------------

The server supports an optional Gemini-style classifier. To enable it, set the following environment variables:

- `GEMINI_ENDPOINT` — the URL of your classifier endpoint that accepts POST { text } and returns JSON { emotion: string, score: number }.
- `GEMINI_API_KEY` — bearer token used for Authorization header.

If these are set the server will call the configured endpoint and return its response. If the call fails or the env vars are missing the server falls back to a fast deterministic heuristic (used for development).

