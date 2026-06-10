#!/usr/bin/env bash
# Build the static bundle: compile + bundle src/main.jsx -> dist/app.js
# React/ReactDOM are bundled in, so the shipped site has zero CDN/runtime deps.
set -euo pipefail
cd "$(dirname "$0")"

# Load local-only secrets (COSTA_PASSWORD) if present — never committed.
if [ -f .env.local ]; then
  set -a; . ./.env.local; set +a
fi

if [ ! -d node_modules/esbuild ]; then
  echo "› installing dependencies (esbuild, react, react-dom)…"
  npm install --no-audit --no-fund
fi

# Encrypt the data: data/casa.json (plaintext, local-only) → data/casa.enc.json
# (ciphertext, the only data file that ships). Needs the password via
# $COSTA_PASSWORD or an interactive prompt. Skipped if there's no plaintext
# locally (e.g. a box that only has the already-encrypted file).
if [ -f data/casa.json ]; then
  echo "› encrypting data/casa.json → data/casa.enc.json"
  node scripts/encrypt.mjs
elif [ -f data/casa.enc.json ]; then
  echo "› no plaintext data/casa.json — keeping existing data/casa.enc.json"
else
  echo "✗ no data/casa.json or data/casa.enc.json found" >&2
  exit 1
fi

echo "› bundling src/main.jsx → dist/app.js"
mkdir -p dist
npx esbuild src/main.jsx \
  --bundle \
  --minify \
  --format=iife \
  --target=es2018 \
  --loader:.jsx=jsx \
  --jsx=transform \
  --define:process.env.NODE_ENV='"production"' \
  --outfile=dist/app.js

echo "✓ built dist/app.js ($(wc -c < dist/app.js | tr -d ' ') bytes)"
