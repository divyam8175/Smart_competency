#!/usr/bin/env bash
# Render build script for frontend (static site)
set -o errexit

npm install --legacy-peer-deps
npm run build
