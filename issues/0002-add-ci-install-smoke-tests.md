Title: Add CI job to run `npm install` across frontend/backend to catch install-time errors (P0)

Description:
Occasional dependency version mismatches (e.g., attempted install of non-existent `libsignal-protocol@^2.0.0`) caused blocking failures during `npm install` and prevented dev workflow. Add a lightweight GitHub Action job that runs `npm ci` or `npm install` for root, frontend, and backend to prevent regressions.

Acceptance criteria:
- Add a GitHub Actions workflow (ci/install.yml) that runs `npm ci` in each package and reports failure early.
- Ensure the job runs on PRs and main branch pushes.
- Document in CONTRIBUTING.md how to add/remove dependencies safely.

Estimated effort: 1 day
Labels: ci, p0
