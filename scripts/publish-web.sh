#!/usr/bin/env bash
# Builds the app for the web and copies it into the website at /app, which is what iPhones install from their Home Screen.
# Run from this repo; then commit apps/web/public/app in nomrank-web. Reads .env.local for the Supabase URL and publishable key.
# shortcut: a manual copy, because a workflow here can't push to the web repo. Automate it with a deploy key once this settles.
set -euo pipefail
WEB="${1:-../Bitecast/apps/web/public/app}"
OUT="$(mktemp -d)"

cp app.json "$OUT/app.json.bak"
trap 'cp "$OUT/app.json.bak" app.json' EXIT
node -e 'const f="app.json",j=require("./"+f);j.expo.experiments.baseUrl="/app";require("fs").writeFileSync(f,JSON.stringify(j,null,2)+"\n")'

npx expo export --platform web --output-dir "$OUT/dist"
rm -rf "$WEB"
cp -r "$OUT/dist" "$WEB"
