Title: Add unit tests and CI coverage for signed prekey verification (P1)

Description:
Add tests that validate server-side verification of signed prekeys (valid and invalid signatures), ensure prekeys are rejected when verification fails, and include the test in CI.

Acceptance criteria:
- Add unit test(s) that call the verification helper and the /prekeys POST endpoint to assert correct behavior when valid and invalid signedPreKey signatures are supplied.
- Ensure CI runs the test (ci-lint-and-typecheck includes a step to run the small test script).

Estimated effort: 1–2 hours
Labels: p1, tests
