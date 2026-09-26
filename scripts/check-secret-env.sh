#!/bin/sh
set -eu

tracked="$(git ls-files | grep -E '(^|/)\.env($|\.)' | grep -vE '(^|/)\.env\.example$' || true)"

if [ -n "$tracked" ]; then
  echo "These env files contain secrets and must not be committed:"
  printf '%s\n' "$tracked"
  exit 1
fi

echo "No secret env files are tracked. .env.example is the only allowed env file."
