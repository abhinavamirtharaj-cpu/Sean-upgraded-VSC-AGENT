# Triage Summary (quick pass)

Scanned repository for TODO/FIXME/markers, runtime errors, and developer blockers. This is a short prioritized list to guide immediate fixes tonight.

## P0 (must fix tonight)
- Install failures caused by pinning a non-existent `libsignal-protocol@^2.0.0` in `frontend/package.json` — *fixed* by making it opt-in and documenting the change. (Why: blocks `npm install` and CI.)
- Crypto is demo-only (HKDF zero salt) — added SECURITY NOTICE and issue `issues/0001-migrate-to-libsignal.md` to track migration to libsignal double-ratchet. (Why: security-critical.)
- Add CI install & build smoke-test to catch install regressions — **added** `.github/workflows/ci-install-and-build.yml`.

## P1 (high priority)
- Add GitHub Actions jobs for lint, typecheck, and Cypress E2E on PRs.
- Persist prekey bundles in Postgres with schema & server-side verification (security + reliability).
- Add tests for `message-reaction` socket flow and Postgres persistence.

## P2 (medium)
- Improve error handling (avoid throwing generic Errors to the user; return structured errors).
- Replace inline `console.error` usage with structured logs and better messages.
- Add integration tests for sentiment endpoint (mock + Gemini env).

## P3 (low)
- UI polish: bubble spacing, Lottie selection, animation timings.
- Docs: CONTRIBUTING.md, developer start guide, environment variables reference.

## Next actions I performed
- Created CI workflow: `.github/workflows/ci-install-and-build.yml` (runs `npm ci` and builds frontend; runs a quick backend module load & sentiment smoke test).
- Created issues: `issues/0001-migrate-to-libsignal.md` (P0), `issues/0002-add-ci-install-smoke-tests.md` (P0).

If you want, I can:
- Start implementing P1 items in order (add lint/typecheck workflow, add Cypress job) — time estimate: 30-60 minutes.
- Open detailed issues for remaining findings with reproduction steps.

Which next step should I take within the remaining time budget (15–30 mins)?
