Title: Migrate demo AES-GCM crypto to libsignal double-ratchet (P0)

Description:
The current demo uses WebCrypto X25519 + HKDF -> AES-GCM with a zero salt and in-memory prekeys. This provides *some* confidentiality for demos but is NOT production-grade and lacks forward secrecy, signature verification, and proper pre-key lifecycle.

Acceptance criteria:
- Implement Signal protocol (libsignal-protocol) integration for message encryption/decryption between users.
- Server-side: support storing and serving signed prekeys and one-time prekeys securely (Postgres integration already exists; add necessary schema and APIs), and verify signatures where applicable.
- Client-side: perform session setup, persist sessions, and rotate keys per Signal specs.
- Add automated tests that verify session establishment and message roundtrip for two clients.
- Add documentation and migration notes in README.

Estimated effort: 3-5 days
Labels: security, p0, crypto
