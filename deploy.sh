#!/usr/bin/env bash
set -e

# Thin wrapper around the GitHub Actions deploy pipeline.
# Local deploys should use `flyctl deploy --remote-only` directly; this script is kept
# only for backward compatibility and documentation references.

echo "🚀 OmniConnect AI deployment"
echo "This repository deploys automatically via GitHub Actions after CI passes."
echo "Running the same command locally:"

if ! command -v flyctl &> /dev/null; then
  echo "❌ flyctl is not installed. Install it from https://fly.io/docs/hands-on/install-flyctl/"
  exit 1
fi

flyctl deploy --remote-only
