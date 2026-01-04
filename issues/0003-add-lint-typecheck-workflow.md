Title: Add lint & typecheck CI jobs (P1)

Description:
Add a CI workflow that runs ESLint and TypeScript `tsc --noEmit` for frontend and backend (where applicable). This prevents type regressions and basic lint issues from being merged.

Acceptance criteria:
- Create `.github/workflows/ci-lint-and-typecheck.yml` that runs on PRs.
- Frontend lint step should be resilient if the repo does not have a `lint` script yet (it will warn).
- Backend `tsc --noEmit` step should fail the job if types don't pass.

Estimated effort: 30–60 minutes
Labels: ci, p1