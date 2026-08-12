#!/usr/bin/env bash
# Bee Moore Advisory — first push.
# The empty repo already exists at github.com/bayo0076/beemooreadvisory
# Run this from inside this folder:   bash PUSH.sh
set -e
git init
git add .
git commit -m "Bee Moore Advisory — commercial site rebuild"
git branch -M main
git remote add origin https://github.com/bayo0076/beemooreadvisory.git
git push -u origin main
echo
echo "Pushed. Next: import the repo at https://vercel.com/new"
echo "  Framework preset: Other   Build command: (empty)   Output dir: (empty)"
