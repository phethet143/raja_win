#!/bin/bash
set -e

GITHUB_USER="adityakarn330-svg"
REPO_NAME="color-prediction-game"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN environment variable is not set."
  echo "Add it via Tools > Secrets in Replit, then re-run this script."
  exit 1
fi

echo "Setting up GitHub remote..."
git remote remove github 2>/dev/null || true
git remote add github "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "Pushing to GitHub (private repo: ${GITHUB_USER}/${REPO_NAME})..."
git push github main --force

echo ""
echo "Done! Code pushed to: https://github.com/${GITHUB_USER}/${REPO_NAME}"
git remote remove github
