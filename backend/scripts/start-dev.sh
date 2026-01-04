#!/usr/bin/env bash
set -e
if command -v ts-node-dev >/dev/null 2>&1; then
  exec ts-node-dev --respawn --transpile-only src/server.ts
else
  echo "ts-node-dev not found. Install dev deps: (cd backend && npm install)"
  echo "If you prefer, run a compiled build: (cd backend && npm run build && npm start)"
  exit 1
fi
