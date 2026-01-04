# SEAN — Minimal Scaffolding

This workspace contains an initial monorepo scaffold for SEAN (PWA + Android APK later).

Structure:
- frontend: Next.js demo app (3000)
- backend: Express + Socket.IO server (3001)
- shared: shared TypeScript types

Quick start (requires Node 18+ and npm):

1. Install root dev deps:

   npm install

2. Install workspace deps:

   npm --prefix frontend install
   npm --prefix backend install

3. Run dev (starts frontend and backend):

   npm run dev

A minimal chat demo is available at http://localhost:3000 — messages are sent as simulated encrypted payloads (base64). Replace the simulated encryption with libsignal integration next.

Development E2EE helpers:
- Client-side key generation demo: use the "End-to-End Encryption (demo)" panel to generate a key pair and inspect the safety number.
- Publish fetched public keys (dev) via POST /keys and GET /keys/:username on the backend to simulate key discovery.
- Prekey bundles (dev): POST /prekeys and GET /prekeys/:username allow storing and retrieving a prekey bundle. Use the "Publish prekey bundle (dev)" button in the E2E demo to test. If `libsignal-protocol` is installed, the demo will publish a libsignal-style bundle (identityKey, signedPreKey object with signature, one-time preKey). Replace with secure server-side storage + verification in production.

