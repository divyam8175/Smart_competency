#!/usr/bin/env bash
# Render build script for frontend
set -o errexit

npm install --legacy-peer-deps
npm run build

# Next.js standalone mode needs static assets alongside server.js
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true
