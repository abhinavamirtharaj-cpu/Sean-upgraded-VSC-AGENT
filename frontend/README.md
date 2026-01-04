# Frontend Cypress tests

To run the E2E tests locally:

1. Start the backend server (http://localhost:3001) and the frontend dev server (http://localhost:3000).
2. Install frontend dev deps: cd frontend && npm install
3. Open Cypress: npm run cypress:open

Note: The tests assume the mock `/sentiment` endpoint is available on the backend. If you have Gemini integrated, the tests still expect the server to return `{ emotion: string, score: number }`.

Optional libsignal support
-------------------------

The frontend includes demo wrappers for `libsignal-protocol` but the package is optional during local development. To enable full libsignal demo flows, install the library manually:

```
cd frontend
npm install libsignal-protocol
```

If you do not install it the app will continue to work using the AES-GCM demo fallback.
