Title: Persist prekey bundles to Postgres and verify signed prekeys (P1)

Description:
Currently prekey bundles are stored in an in-memory Map. For reliability and proper Signal integration, prekey bundles should be persisted and the server should verify the signed prekey signatures before accepting a bundle.

Acceptance criteria:
- Add Postgres migration to create `prekeys` table (done).
- Update server `/prekeys` POST and GET endpoints to persist to Postgres and fetch from it (done, with fallback to in-memory).
- Implement verification logic for signed prekeys: validate signature using the provided identity key before accepting bundle (TODO to implement next).
- Add unit tests for POST/GET prekeys and signature verification.

Estimated effort: 2-4 hours
Labels: p1, backend, crypto
