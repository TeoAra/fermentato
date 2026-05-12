#!/bin/bash
set -e
npm install
npx update-browserslist-db@latest --yes 2>/dev/null || true
npm run db:push
