# Contributing

Quick start for running tests and E2E locally:

1. Start Postgres (if you want to test Postgres-backed features):
   - docker run --name sean-postgres -e POSTGRES_PASSWORD=pass -e POSTGRES_USER=sean -e POSTGRES_DB=sean -p 5433:5432 -d postgres:15
   - export DATABASE_URL=postgres://sean:pass@localhost:5433/sean
   - cd backend && node scripts/migrate-reactions.js

2. Install dependencies:
   - cd frontend && npm install
   - cd backend && npm install

3. Start backend (dev):
   - cd backend && npm run dev

4. Start frontend (dev):
   - cd frontend && npm run dev

5. Run Cypress locally:
   - cd frontend
   - npm run cypress:open
   - or run headless: npx cypress run --spec "cypress/e2e/**/*.spec.ts"

Notes:
- If you rely on `libsignal-protocol` for the libsignal demo flows, install it explicitly in `frontend`:
  - cd frontend && npm install libsignal-protocol
- The CI runs an install+build job and a Cypress job for PRs; if you add new packages, ensure they install cleanly.
